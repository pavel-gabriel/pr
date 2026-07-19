import Anthropic from "@anthropic-ai/sdk";

export function isTextAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function model(): string {
  return process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
}

export interface PromoPostInput {
  businessName: string;
  businessType: string;
  subject: string;
  tone: string;
  channel: string;
}

export interface PromoPostResult {
  variants: string[];
  hashtags: string[];
}

/** Generează 3 variante de postare de promovare + hashtag-uri. */
export async function generatePromoPost(
  input: PromoPostInput
): Promise<PromoPostResult> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: model(),
    max_tokens: 2048,
    system:
      "Ești un copywriter român specializat în promovarea afacerilor mici pe " +
      "social media. Scrii texte care sună natural și uman, nu ca reclamele " +
      "generice de AI. Fără clișee («nu rata ocazia», «experiență de neuitat»), " +
      "fără superlative goale. Adaptezi lungimea și tonul la canalul cerut " +
      "(Facebook: 2-4 fraze; Instagram: scurt + emoji cu măsură; TikTok: hook " +
      "puternic în prima frază; Google Business: informativ, cu CTA concret).",
    messages: [
      {
        role: "user",
        content: [
          `Afacere: ${input.businessName} (${input.businessType})`,
          `Ce promovăm: ${input.subject}`,
          `Ton: ${input.tone}`,
          `Canal: ${input.channel}`,
          "",
          "Scrie 3 variante distincte de postare (abordări diferite, nu reformulări) și 5-8 hashtag-uri relevante în română.",
        ].join("\n"),
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            variants: {
              type: "array",
              items: { type: "string" },
              description: "Exact 3 variante de postare, gata de publicat.",
            },
            hashtags: {
              type: "array",
              items: { type: "string" },
              description: "5-8 hashtag-uri fără #, în română.",
            },
          },
          required: ["variants", "hashtags"],
          additionalProperties: false,
        },
      },
    },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Cererea nu a putut fi procesată — reformulează subiectul.");
  }
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Răspuns gol de la AI.");
  }
  const parsed = JSON.parse(textBlock.text) as PromoPostResult;
  return {
    variants: parsed.variants.slice(0, 3),
    hashtags: parsed.hashtags.slice(0, 8),
  };
}

export interface PosterCopyResult {
  headline: string;
  subtitle: string;
  cta: string;
}

/** Generează textele unui afiș (headline scurt, subtitlu, CTA) dintr-un brief. */
export async function generatePosterCopy(
  businessName: string,
  brief: string
): Promise<PosterCopyResult> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: model(),
    max_tokens: 1024,
    system:
      "Ești un copywriter român care scrie texte pentru afișe de promovare " +
      "(print și social media). Textele sunt scurte, percutante și fără " +
      "clișee de reclamă. Headline-ul are maximum 6 cuvinte și e cârligul " +
      "principal; subtitlul (1 frază) dă contextul; CTA-ul are 2-4 cuvinte.",
    messages: [
      {
        role: "user",
        content: `Afacere: ${businessName}\nCe promovează afișul: ${brief}\n\nScrie textele afișului.`,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            headline: { type: "string", description: "Maxim 6 cuvinte, fără punct final." },
            subtitle: { type: "string", description: "O frază de context." },
            cta: { type: "string", description: "Îndemn scurt, 2-4 cuvinte." },
          },
          required: ["headline", "subtitle", "cta"],
          additionalProperties: false,
        },
      },
    },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Cererea nu a putut fi procesată — reformulează descrierea.");
  }
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Răspuns gol de la AI.");
  }
  return JSON.parse(textBlock.text) as PosterCopyResult;
}

// ── Calendar de conținut ─────────────────────────────────────────────────

export interface CalendarIdea {
  day: number;
  channel: string;
  type: string;
  idea: string;
}

/** Plan de conținut pe o lună: 10-12 idei de postări cu zile și canale. */
export async function generateContentCalendar(input: {
  businessName: string;
  businessType: string;
  monthName: string;
  focus?: string;
}): Promise<{ ideas: CalendarIdea[] }> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: model(),
    max_tokens: 4096,
    system:
      "Ești strategul de social media al unei afaceri mici din România. " +
      "Construiești un plan de conținut pe o lună: idei concrete și variate " +
      "(nu doar oferte — și behind-the-scenes, echipă, produse, întrebări " +
      "pentru comunitate, recenzii repostate, educaționale). Fiecare idee e " +
      "suficient de concretă cât să poată fi transformată direct în postare. " +
      "Ține cont de sărbătorile și ocaziile românești din luna respectivă.",
    messages: [
      {
        role: "user",
        content: [
          `Afacere: ${input.businessName} (${input.businessType || "afacere locală"})`,
          `Luna: ${input.monthName}`,
          input.focus ? `Accent special: ${input.focus}` : "",
          "",
          "Generează 10-12 idei de postări distribuite pe parcursul lunii.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            ideas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "integer", description: "Ziua din lună (1-31)." },
                  channel: {
                    type: "string",
                    description: "Canalul recomandat: Facebook, Instagram, TikTok sau Google Business.",
                  },
                  type: {
                    type: "string",
                    description: "Tipul: ofertă, behind-the-scenes, produs, comunitate, educațional, sărbătoare.",
                  },
                  idea: { type: "string", description: "Ideea concretă a postării, 1-2 fraze." },
                },
                required: ["day", "channel", "type", "idea"],
                additionalProperties: false,
              },
            },
          },
          required: ["ideas"],
          additionalProperties: false,
        },
      },
    },
  });

  if (response.stop_reason === "refusal") throw new Error("Cererea nu a putut fi procesată.");
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Răspuns gol de la AI.");
  const parsed = JSON.parse(textBlock.text) as { ideas: CalendarIdea[] };
  return { ideas: parsed.ideas.slice(0, 12).sort((a, b) => a.day - b.day) };
}

// ── Adaptor multi-canal ──────────────────────────────────────────────────

export interface AdaptedContent {
  facebook: string;
  instagram: string;
  tiktok: string;
  google_business: string;
  english?: string;
}

/** Adaptează un text scris o dată pentru toate canalele (+ EN opțional). */
export async function adaptContent(input: {
  businessName: string;
  text: string;
  includeEnglish: boolean;
}): Promise<AdaptedContent> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: model(),
    max_tokens: 3072,
    system:
      "Ești un social media manager român. Primești un mesaj de promovare și " +
      "îl adaptezi pentru fiecare canal, păstrând sensul dar schimbând forma: " +
      "Facebook — 2-4 fraze, ton conversațional; Instagram — scurt, aerisit, " +
      "emoji cu măsură; TikTok — hook puternic în prima frază, limbaj tânăr; " +
      "Google Business — informativ, cu detalii practice și CTA concret. " +
      "Fără clișee de reclamă.",
    messages: [
      {
        role: "user",
        content:
          `Afacere: ${input.businessName}\nMesajul original: „${input.text}”\n\n` +
          `Adaptează-l pentru cele 4 canale${input.includeEnglish ? " și adaugă o variantă în engleză (pentru turiști, stil Instagram)" : ""}.`,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            facebook: { type: "string" },
            instagram: { type: "string" },
            tiktok: { type: "string" },
            google_business: { type: "string" },
            english: {
              type: ["string", "null"],
              description: "Varianta în engleză, sau null dacă nu a fost cerută.",
            },
          },
          required: ["facebook", "instagram", "tiktok", "google_business", "english"],
          additionalProperties: false,
        },
      },
    },
  });

  if (response.stop_reason === "refusal") throw new Error("Cererea nu a putut fi procesată.");
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Răspuns gol de la AI.");
  const parsed = JSON.parse(textBlock.text) as AdaptedContent & { english: string | null };
  return {
    facebook: parsed.facebook,
    instagram: parsed.instagram,
    tiktok: parsed.tiktok,
    google_business: parsed.google_business,
    english: input.includeEnglish && parsed.english ? parsed.english : undefined,
  };
}

// ── Script de Reels/TikTok ───────────────────────────────────────────────

export interface ReelsScript {
  hook: string;
  scenes: { shot: string; action: string; overlay: string }[];
  audio: string;
  caption: string;
}

/** Scenariu de Reel filmabil cu telefonul, cadru cu cadru. */
export async function generateReelsScript(input: {
  businessName: string;
  businessType: string;
  subject: string;
}): Promise<ReelsScript> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: model(),
    max_tokens: 2048,
    system:
      "Ești un creator de conținut video pentru afaceri mici din România. " +
      "Scrii scenarii de Reels/TikTok de 15-30 de secunde pe care proprietarul " +
      "le poate filma singur cu telefonul, fără echipament. Hook-ul din primele " +
      "2 secunde decide totul. Cadrele sunt simple și concrete (ce filmezi, ce " +
      "se întâmplă, ce text apare pe ecran). Stil autentic, nu corporatist.",
    messages: [
      {
        role: "user",
        content: `Afacere: ${input.businessName} (${input.businessType || "afacere locală"})\nSubiectul clipului: ${input.subject}\n\nScrie scenariul.`,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            hook: { type: "string", description: "Prima frază/cadru care oprește scroll-ul." },
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  shot: { type: "string", description: "Ce filmezi (cadrul)." },
                  action: { type: "string", description: "Ce se întâmplă în cadru." },
                  overlay: { type: "string", description: "Textul care apare pe ecran." },
                },
                required: ["shot", "action", "overlay"],
                additionalProperties: false,
              },
              description: "3-5 cadre.",
            },
            audio: { type: "string", description: "Sugestie de sunet/muzică (tip, nu piesă exactă)." },
            caption: { type: "string", description: "Descrierea postării, cu 3-5 hashtag-uri." },
          },
          required: ["hook", "scenes", "audio", "caption"],
          additionalProperties: false,
        },
      },
    },
  });

  if (response.stop_reason === "refusal") throw new Error("Cererea nu a putut fi procesată.");
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Răspuns gol de la AI.");
  return JSON.parse(textBlock.text) as ReelsScript;
}

// ── Campanie sezonieră ───────────────────────────────────────────────────

export interface SeasonalCampaign {
  concept: string;
  posts: string[];
  posterHeadline: string;
  posterSubtitle: string;
  posterCta: string;
  hashtags: string[];
}

/** Mini-campanie pentru o ocazie: concept + 2 postări + textele afișului. */
export async function generateCampaign(input: {
  businessName: string;
  businessType: string;
  occasionName: string;
  occasionAngle: string;
  occasionDate: string;
}): Promise<SeasonalCampaign> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: model(),
    max_tokens: 3072,
    system:
      "Ești un marketer român pentru afaceri mici. Construiești mini-campanii " +
      "pentru ocazii și sărbători: un concept simplu de ofertă/activare " +
      "potrivit tipului de afacere, două postări (una de anunț cu ~o săptămână " +
      "înainte, una de reminder în ziua respectivă) și textele unui afiș. " +
      "Concret și aplicabil, fără clișee.",
    messages: [
      {
        role: "user",
        content: [
          `Afacere: ${input.businessName} (${input.businessType || "afacere locală"})`,
          `Ocazia: ${input.occasionName} (${input.occasionDate})`,
          `Unghi sugerat: ${input.occasionAngle}`,
          "",
          "Construiește campania.",
        ].join("\n"),
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            concept: { type: "string", description: "Conceptul campaniei, 1-2 fraze." },
            posts: {
              type: "array",
              items: { type: "string" },
              description: "Exact 2 postări: anunțul și reminder-ul din ziua ocaziei.",
            },
            posterHeadline: { type: "string", description: "Titlul afișului, max 6 cuvinte." },
            posterSubtitle: { type: "string" },
            posterCta: { type: "string", description: "2-4 cuvinte." },
            hashtags: { type: "array", items: { type: "string" }, description: "4-6 hashtag-uri fără #." },
          },
          required: ["concept", "posts", "posterHeadline", "posterSubtitle", "posterCta", "hashtags"],
          additionalProperties: false,
        },
      },
    },
  });

  if (response.stop_reason === "refusal") throw new Error("Cererea nu a putut fi procesată.");
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Răspuns gol de la AI.");
  const parsed = JSON.parse(textBlock.text) as SeasonalCampaign;
  return { ...parsed, posts: parsed.posts.slice(0, 2), hashtags: parsed.hashtags.slice(0, 6) };
}

export interface ReviewReplyInput {
  businessName: string;
  rating: number;
  review: string;
}

/** Generează un răspuns profesionist la o recenzie Google. */
export async function generateReviewReply(
  input: ReviewReplyInput
): Promise<string> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: model(),
    max_tokens: 1024,
    system:
      "Ești managerul unei afaceri mici din România și răspunzi la recenzii " +
      "Google. Răspunsurile tale sunt scurte (2-4 fraze), umane și specifice — " +
      "referă-te la ce a spus clientul, nu da răspunsuri-șablon. La recenziile " +
      "negative: mulțumești pentru feedback, recunoști problema fără scuze " +
      "goale, spui concret ce faceți diferit și inviți persoana să revină sau " +
      "să vă contacteze direct. Nu te certa niciodată cu clientul. La cele " +
      "pozitive: mulțumești cald și personal, fără exagerări.",
    messages: [
      {
        role: "user",
        content: [
          `Afacere: ${input.businessName}`,
          `Rating: ${input.rating}/5`,
          `Recenzia clientului: „${input.review}”`,
          "",
          "Scrie răspunsul (doar textul răspunsului, fără alte explicații).",
        ].join("\n"),
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Cererea nu a putut fi procesată.");
  }
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Răspuns gol de la AI.");
  }
  return textBlock.text.trim();
}
