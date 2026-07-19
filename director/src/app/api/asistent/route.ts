import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseQuery, searchListings, type AssistantContext } from "@/lib/assistant";
import type { City, ListingCategory, ListingTag } from "@/lib/types";

// Rate limiting simplu per IP (în memorie — suficient pentru o instanță).
const requestLog = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return true;
  recent.push(now);
  requestLog.set(ip, recent);
  if (requestLog.size > 5000) requestLog.clear(); // protecție memorie
  return false;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Prea multe cereri — încearcă din nou într-un minut." },
      { status: 429 }
    );
  }

  let message: string;
  try {
    const body = await request.json();
    message = String(body.message ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });
  }
  if (!message || message.length > 300) {
    return NextResponse.json(
      { error: "Scrie un mesaj de maximum 300 de caractere." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const [{ data: cities }, { data: categories }, { data: tags }] = await Promise.all([
    admin.from("cities").select("*"),
    admin.from("listing_categories").select("*").order("sort_order"),
    admin.from("listing_tags").select("*"),
  ]);
  const context: AssistantContext = {
    cities: (cities ?? []) as City[],
    categories: (categories ?? []) as ListingCategory[],
    tags: (tags ?? []) as ListingTag[],
  };

  const filters = await parseQuery(message, context);
  const { listings, relaxed } = await searchListings(filters, context);

  let reply = filters.reply;
  if (listings.length === 0) {
    reply =
      "Nu am găsit încă nimic potrivit în director pentru cererea asta. " +
      "Încearcă o altă categorie sau specialitate — sau, dacă e localul tău, adaugă-l gratuit!";
  } else if (relaxed) {
    reply += " Nu am găsit potriviri exacte, dar iată cele mai apropiate:";
  }

  return NextResponse.json({
    reply,
    listings: listings.map((l) => ({
      name: l.name,
      slug: l.slug,
      category: l.category?.name ?? "",
      icon: l.category?.icon ?? "🏪",
      city: l.city?.name ?? "",
      rating: l.google_rating,
      rating_count: l.google_rating_count,
      image: l.images[0] ?? null,
      is_featured: l.is_featured,
      tags: (l.tags ?? []).map((t) => t.name).slice(0, 3),
    })),
  });
}
