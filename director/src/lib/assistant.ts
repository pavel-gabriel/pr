import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  City,
  ListingCategory,
  ListingTag,
  ListingWithRelations,
} from "@/lib/types";
import { LISTING_SELECT } from "@/lib/queries";

/** Filtrele extrase dintr-un mesaj în limbaj natural. */
export interface AssistantFilters {
  reply: string;
  city_slug: string | null;
  category_slug: string | null;
  tag_slugs: string[];
  min_rating: number | null;
  keywords: string[];
}

export interface AssistantContext {
  cities: City[];
  categories: ListingCategory[];
  tags: ListingTag[];
}

export function isAssistantAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const FILTER_SCHEMA = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description:
        "Răspuns scurt și prietenos în română (1-2 propoziții) care confirmă ce cauți. Nu inventa localuri.",
    },
    city_slug: {
      type: ["string", "null"],
      description: "Slug-ul orașului menționat, sau null dacă nu e menționat.",
    },
    category_slug: {
      type: ["string", "null"],
      description: "Slug-ul categoriei potrivite, sau null.",
    },
    tag_slugs: {
      type: "array",
      items: { type: "string" },
      description: "Slug-urile specialităților potrivite (0-3).",
    },
    min_rating: {
      type: ["number", "null"],
      description: "Ratingul Google minim cerut (1-5), sau null.",
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      description:
        "Cuvinte-cheie de căutat în nume/descriere DOAR dacă cererea nu e acoperită de categorie/specialități (max 3).",
    },
  },
  required: ["reply", "city_slug", "category_slug", "tag_slugs", "min_rating", "keywords"],
  additionalProperties: false,
} as const;

/** Extrage filtrele cu Claude (structured outputs). */
async function parseWithClaude(
  message: string,
  context: AssistantContext
): Promise<AssistantFilters | null> {
  const client = new Anthropic();

  const catalog = [
    `Orașe active: ${context.cities.filter((c) => c.is_active).map((c) => `${c.name} (${c.slug})`).join(", ")}`,
    `Categorii: ${context.categories.map((c) => `${c.name} (${c.slug})`).join(", ")}`,
    `Specialități: ${context.tags.map((t) => `${t.name} (${t.slug})`).join(", ")}`,
  ].join("\n");

  try {
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
      max_tokens: 1024,
      system:
        "Ești asistentul unui director local de afaceri din România. " +
        "Transformi cererea utilizatorului în filtre de căutare, folosind DOAR " +
        "slug-urile din catalogul de mai jos. Alege categoria și specialitățile " +
        "cele mai apropiate de sensul cererii (ex: „chinezesc” → specialitatea " +
        "chinezeasca + categoria restaurante; „unde beau o bere bună” → categoria " +
        "baruri + specialitatea bere-artizanala). Dacă cererea nu se potrivește cu " +
        "nimic din catalog, folosește keywords.\n\n" +
        catalog,
      messages: [{ role: "user", content: message }],
      output_config: {
        format: {
          type: "json_schema",
          schema: FILTER_SCHEMA,
        },
      },
    });

    if (response.stop_reason === "refusal") return null;
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;
    const parsed = JSON.parse(textBlock.text) as AssistantFilters;
    return {
      reply: parsed.reply || "Am înțeles — caut recomandări.",
      city_slug: parsed.city_slug ?? null,
      category_slug: parsed.category_slug ?? null,
      tag_slugs: Array.isArray(parsed.tag_slugs) ? parsed.tag_slugs.slice(0, 3) : [],
      min_rating:
        typeof parsed.min_rating === "number" &&
        parsed.min_rating >= 1 &&
        parsed.min_rating <= 5
          ? parsed.min_rating
          : null,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 3) : [],
    };
  } catch {
    // API indisponibil / răspuns neparsabil → cădem pe parserul local.
    return null;
  }
}

/** Parser local (fără AI): rating din text + potrivire pe numele din catalog. */
function parseWithRules(
  message: string,
  context: AssistantContext
): AssistantFilters {
  const normalized = message
    .toLowerCase()
    .replace(/ă|â/g, "a")
    .replace(/î/g, "i")
    .replace(/ș|ş/g, "s")
    .replace(/ț|ţ/g, "t");

  // Rating: „4.85”, „nota 4,5”, „peste 4”
  let minRating: number | null = null;
  const ratingMatch = normalized.match(/(?:nota|rating|peste|minim)?\s*([1-5](?:[.,]\d{1,2})?)\s*(?:\+|si peste|stele)?/);
  if (ratingMatch && /nota|rating|peste|minim|\+|stele/.test(normalized)) {
    const value = parseFloat(ratingMatch[1].replace(",", "."));
    if (value >= 1 && value <= 5) minRating = value;
  }

  const matchByName = <T extends { name: string; slug: string }>(items: T[]) =>
    items.filter((item) => {
      const name = item.name
        .toLowerCase()
        .replace(/ă|â/g, "a")
        .replace(/î/g, "i")
        .replace(/ș|ş/g, "s")
        .replace(/ț|ţ/g, "t");
      // potrivim pe rădăcini: „chinezesc” ⊂ „bucatarie chinezeasca”
      const stems = [...name.split(/\s+/), item.slug.replace(/-/g, " ")]
        .filter((w) => w.length > 3)
        .map((w) => w.slice(0, 6));
      return stems.some((stem) => normalized.includes(stem));
    });

  const city = matchByName(context.cities.filter((c) => c.is_active))[0] ?? null;
  const category = matchByName(context.categories)[0] ?? null;
  const tags = matchByName(context.tags).slice(0, 3);

  return {
    reply: "Am căutat în director după cererea ta:",
    city_slug: city?.slug ?? null,
    category_slug: category?.slug ?? null,
    tag_slugs: tags.map((t) => t.slug),
    min_rating: minRating,
    keywords:
      category || tags.length > 0
        ? []
        : normalized
            .split(/\s+/)
            .filter((w) => w.length > 4)
            .slice(0, 2),
  };
}

export async function parseQuery(
  message: string,
  context: AssistantContext
): Promise<AssistantFilters> {
  if (isAssistantAiConfigured()) {
    const aiResult = await parseWithClaude(message, context);
    if (aiResult) return aiResult;
  }
  return parseWithRules(message, context);
}

/**
 * Caută listările aprobate după filtre, relaxând progresiv criteriile
 * (întâi renunțăm la keywords, apoi la rating) ca să nu întoarcem gol degeaba.
 */
export async function searchListings(
  filters: AssistantFilters,
  context: AssistantContext,
  limit = 5
): Promise<{ listings: ListingWithRelations[]; relaxed: boolean }> {
  const admin = createAdminClient();
  const city =
    context.cities.find((c) => c.slug === filters.city_slug && c.is_active) ??
    context.cities.find((c) => c.is_active);
  if (!city) return { listings: [], relaxed: false };

  const category = context.categories.find((c) => c.slug === filters.category_slug);
  const validTagSlugs = filters.tag_slugs.filter((slug) =>
    context.tags.some((t) => t.slug === slug)
  );

  async function run(withKeywords: boolean, withRating: boolean) {
    let query = admin
      .from("listings")
      .select(
        validTagSlugs.length > 0
          ? "*, category:listing_categories(*), city:cities(*), tags:listing_tags!inner(*)"
          : LISTING_SELECT
      )
      .eq("status", "approved")
      .eq("city_id", city!.id);
    if (category) query = query.eq("category_id", category.id);
    if (validTagSlugs.length > 0) query = query.in("tags.slug", validTagSlugs);
    if (withRating && filters.min_rating !== null) {
      query = query.gte("google_rating", filters.min_rating);
    }
    if (withKeywords && filters.keywords.length > 0) {
      const pattern = filters.keywords
        .map((kw) => kw.replace(/[%_,()]/g, ""))
        .filter(Boolean)
        .map((kw) => `name.ilike.%${kw}%,description.ilike.%${kw}%`)
        .join(",");
      if (pattern) query = query.or(pattern);
    }
    const { data } = await query
      .order("is_featured", { ascending: false })
      .order("google_rating", { ascending: false, nullsFirst: false })
      .limit(limit);
    return (data ?? []) as unknown as ListingWithRelations[];
  }

  let results = await run(true, true);
  if (results.length > 0) return { listings: results, relaxed: false };

  results = await run(false, true);
  if (results.length > 0) return { listings: results, relaxed: filters.keywords.length > 0 };

  results = await run(false, false);
  return { listings: results, relaxed: true };
}
