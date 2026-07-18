import { fal } from "@fal-ai/client";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_MODEL = "fal-ai/kling-video/v2.5-turbo/pro/image-to-video";

/** Prompt implicit pentru clipuri de prezentare mâncare (orbit cinematic). */
export const DEFAULT_FOOD_PROMPT =
  "Slow cinematic orbit around the dish, professional food commercial, " +
  "gentle steam rising, shallow depth of field, warm appetizing light, " +
  "no hands, no people";

export function isVideoConfigured(): boolean {
  return Boolean(process.env.FAL_KEY);
}

function configuredFal() {
  fal.config({ credentials: process.env.FAL_KEY });
  return fal;
}

/** Trimite un job de generare în coada fal.ai; întoarce request_id. */
export async function submitVideoJob(opts: {
  imageUrl: string;
  prompt?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
}): Promise<string> {
  const client = configuredFal();
  const model = process.env.FAL_VIDEO_MODEL || DEFAULT_MODEL;
  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/video/webhook`;

  const { request_id } = await client.queue.submit(model, {
    input: {
      prompt: opts.prompt || DEFAULT_FOOD_PROMPT,
      image_url: opts.imageUrl,
      duration: "5",
      aspect_ratio: opts.aspectRatio ?? "16:9",
    },
    webhookUrl,
  });
  return request_id;
}

/** Interoghează direct statusul unui job (fallback când webhook-ul nu ajunge,
 *  de ex. în dezvoltare pe localhost). */
export async function fetchJobResult(
  requestId: string
): Promise<{ status: "pending" | "done" | "failed"; videoUrl?: string; error?: string }> {
  const client = configuredFal();
  const model = process.env.FAL_VIDEO_MODEL || DEFAULT_MODEL;

  const status = await client.queue.status(model, {
    requestId,
    logs: false,
  });

  if (status.status === "COMPLETED") {
    const { data } = await client.queue.result(model, { requestId });
    const videoUrl = (data as { video?: { url?: string } })?.video?.url;
    if (!videoUrl) return { status: "failed", error: "Rezultat fără URL video" };
    return { status: "done", videoUrl };
  }
  return { status: "pending" };
}

/**
 * Copiază clipul generat de la fal în Supabase Storage (URL-urile fal sunt
 * temporare) și întoarce URL-ul public permanent.
 */
export async function persistVideo(
  falVideoUrl: string,
  restaurantId: string,
  jobId: string
): Promise<string> {
  const res = await fetch(falVideoUrl);
  if (!res.ok) throw new Error(`Descărcarea clipului a eșuat (${res.status})`);
  const buffer = await res.arrayBuffer();

  const admin = createAdminClient();
  const path = `${restaurantId}/${jobId}.mp4`;
  const { error } = await admin.storage
    .from("menu-videos")
    .upload(path, buffer, { contentType: "video/mp4", upsert: true });
  if (error) throw new Error(`Salvarea clipului a eșuat: ${error.message}`);

  const { data } = admin.storage.from("menu-videos").getPublicUrl(path);
  return data.publicUrl;
}
