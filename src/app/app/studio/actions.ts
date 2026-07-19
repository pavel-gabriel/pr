"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import {
  STUDIO_PROMPTS,
  fetchJobResult,
  isVideoConfigured,
  persistVideo,
  submitVideoJob,
} from "@/lib/video/fal";
import {
  generatePromoPost,
  generateReviewReply,
  isTextAiConfigured,
} from "@/lib/ai";
import { getOwnedRestaurant } from "../actions";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/studio");
  return user;
}

/** Planul contului = planul restaurantului (dacă există), altfel trial. */
async function currentPlan(): Promise<Plan> {
  const restaurant = await getOwnedRestaurant();
  return restaurant?.plan ?? "trial";
}

function monthStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

/** Generările video din luna curentă: meniu (video_jobs) + studio (promo_videos). */
async function videosUsedThisMonth(userId: string): Promise<number> {
  const admin = createAdminClient();
  const restaurant = await getOwnedRestaurant();
  const [{ count: promoCount }, { count: menuCount }] = await Promise.all([
    admin
      .from("promo_videos")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .neq("status", "failed")
      .gte("created_at", monthStart()),
    restaurant
      ? admin
          .from("video_jobs")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", restaurant.id)
          .neq("status", "failed")
          .gte("created_at", monthStart())
      : Promise.resolve({ count: 0 }),
  ]);
  return (promoCount ?? 0) + (menuCount ?? 0);
}

async function textsUsedThisMonth(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("promo_texts")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .gte("created_at", monthStart());
  return count ?? 0;
}

export async function getStudioUsage() {
  const user = await requireUser();
  const plan = await currentPlan();
  const [videosUsed, textsUsed] = await Promise.all([
    videosUsedThisMonth(user.id),
    textsUsedThisMonth(user.id),
  ]);
  return {
    plan,
    videosUsed,
    videosLimit: PLANS[plan].videosPerMonth,
    textsUsed,
    textsLimit: PLANS[plan].textsPerMonth,
  };
}

// ── Video promoțional ─────────────────────────────────────────────────────

export async function generateStudioVideo(formData: FormData) {
  const user = await requireUser();

  if (!isVideoConfigured()) {
    redirect(
      `/app/studio?error=${encodeURIComponent("Generarea video nu este configurată încă (lipsește cheia fal.ai).")}`
    );
  }

  const kind = String(formData.get("kind") ?? "locatie");
  const preset = STUDIO_PROMPTS[kind] ?? STUDIO_PROMPTS.altele;
  const customPrompt = String(formData.get("prompt") ?? "").trim();
  const aspectRatio =
    String(formData.get("aspect_ratio")) === "9:16" ? "9:16" : "16:9";

  const plan = await currentPlan();
  const used = await videosUsedThisMonth(user.id);
  if (used >= PLANS[plan].videosPerMonth) {
    redirect(
      `/app/studio?error=${encodeURIComponent(`Ai folosit toate cele ${PLANS[plan].videosPerMonth} generări video din planul ${PLANS[plan].name} luna aceasta.`)}`
    );
  }

  // Upload-ul pozelor sursă (prima poză e cadrul de pornire al clipului).
  const admin = createAdminClient();
  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, 3);
  if (files.length === 0) {
    redirect(`/app/studio?error=${encodeURIComponent("Încarcă cel puțin o poză.")}`);
  }

  const imageUrls: string[] = [];
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      redirect(`/app/studio?error=${encodeURIComponent("Pozele trebuie să aibă maximum 5MB.")}`);
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await admin.storage
      .from("promo-images")
      .upload(path, file, { contentType: file.type || "image/jpeg" });
    if (error) {
      redirect(`/app/studio?error=${encodeURIComponent(`Upload eșuat: ${error.message}`)}`);
    }
    imageUrls.push(admin.storage.from("promo-images").getPublicUrl(path).data.publicUrl);
  }

  const { data: job, error: insertError } = await admin
    .from("promo_videos")
    .insert({
      owner_id: user.id,
      kind,
      source_image_urls: imageUrls,
      prompt: customPrompt || null,
      aspect_ratio: aspectRatio,
    })
    .select("id")
    .single();
  if (insertError || !job) {
    redirect(`/app/studio?error=${encodeURIComponent("Nu am putut crea jobul.")}`);
  }

  try {
    const requestId = await submitVideoJob({
      imageUrl: imageUrls[0],
      prompt: customPrompt || preset.prompt,
      aspectRatio,
    });
    await admin
      .from("promo_videos")
      .update({ provider_request_id: requestId, status: "processing" })
      .eq("id", job.id);
  } catch (e) {
    await admin
      .from("promo_videos")
      .update({
        status: "failed",
        error: e instanceof Error ? e.message : "Trimiterea către fal.ai a eșuat",
      })
      .eq("id", job.id);
    redirect(
      `/app/studio?error=${encodeURIComponent("Trimiterea către fal.ai a eșuat — verifică cheia FAL_KEY.")}`
    );
  }

  revalidatePath("/app/studio");
  redirect("/app/studio");
}

/** Fallback manual pentru dezvoltare (webhook-ul nu ajunge la localhost). */
export async function refreshStudioJob(formData: FormData) {
  const user = await requireUser();
  const jobId = String(formData.get("job_id") ?? "");

  const admin = createAdminClient();
  const { data: job } = await admin
    .from("promo_videos")
    .select("*")
    .eq("id", jobId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (job?.provider_request_id && job.status === "processing") {
    try {
      const result = await fetchJobResult(job.provider_request_id);
      if (result.status === "done" && result.videoUrl) {
        const publicUrl = await persistVideo(
          result.videoUrl,
          `promo-${user.id}`,
          job.id
        );
        await admin
          .from("promo_videos")
          .update({
            status: "done",
            result_video_url: publicUrl,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      } else if (result.status === "failed") {
        await admin
          .from("promo_videos")
          .update({ status: "failed", error: result.error ?? "Generare eșuată" })
          .eq("id", job.id);
      }
    } catch {
      // rămâne în procesare; se poate reîncerca
    }
  }

  revalidatePath("/app/studio");
  redirect("/app/studio");
}

// ── Texte de promovare ────────────────────────────────────────────────────

async function checkTextQuota(userId: string) {
  const plan = await currentPlan();
  const used = await textsUsedThisMonth(userId);
  if (used >= PLANS[plan].textsPerMonth) {
    redirect(
      `/app/studio?error=${encodeURIComponent(`Ai folosit toate cele ${PLANS[plan].textsPerMonth} generări de text din planul ${PLANS[plan].name} luna aceasta.`)}`
    );
  }
}

export async function generatePostAction(formData: FormData) {
  const user = await requireUser();
  if (!isTextAiConfigured()) {
    redirect(
      `/app/studio?error=${encodeURIComponent("Generarea de texte nu este configurată încă (lipsește cheia Anthropic).")}`
    );
  }
  await checkTextQuota(user.id);

  const input = {
    businessName: String(formData.get("business_name") ?? "").trim(),
    businessType: String(formData.get("business_type") ?? "").trim(),
    subject: String(formData.get("subject") ?? "").trim(),
    tone: String(formData.get("tone") ?? "prietenos"),
    channel: String(formData.get("channel") ?? "Facebook"),
  };
  if (!input.businessName || !input.subject) {
    redirect(
      `/app/studio?error=${encodeURIComponent("Numele afacerii și subiectul sunt obligatorii.")}`
    );
  }

  try {
    const result = await generatePromoPost(input);
    const admin = createAdminClient();
    await admin.from("promo_texts").insert({
      owner_id: user.id,
      kind: "postare",
      input,
      result,
    });
  } catch (e) {
    redirect(
      `/app/studio?error=${encodeURIComponent(e instanceof Error ? e.message : "Generarea a eșuat.")}`
    );
  }

  revalidatePath("/app/studio");
  redirect("/app/studio?ok=1");
}

export async function reviewReplyAction(formData: FormData) {
  const user = await requireUser();
  if (!isTextAiConfigured()) {
    redirect(
      `/app/studio?error=${encodeURIComponent("Generarea de texte nu este configurată încă (lipsește cheia Anthropic).")}`
    );
  }
  await checkTextQuota(user.id);

  const input = {
    businessName: String(formData.get("business_name") ?? "").trim(),
    rating: Math.min(5, Math.max(1, parseInt(String(formData.get("rating") || "5"), 10) || 5)),
    review: String(formData.get("review") ?? "").trim(),
  };
  if (!input.businessName || !input.review) {
    redirect(
      `/app/studio?error=${encodeURIComponent("Numele afacerii și textul recenziei sunt obligatorii.")}`
    );
  }

  try {
    const reply = await generateReviewReply(input);
    const admin = createAdminClient();
    await admin.from("promo_texts").insert({
      owner_id: user.id,
      kind: "recenzie",
      input,
      result: { reply },
    });
  } catch (e) {
    redirect(
      `/app/studio?error=${encodeURIComponent(e instanceof Error ? e.message : "Generarea a eșuat.")}`
    );
  }

  revalidatePath("/app/studio");
  redirect("/app/studio?ok=1");
}
