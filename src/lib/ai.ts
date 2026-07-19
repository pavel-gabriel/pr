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
