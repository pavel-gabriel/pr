"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/plans";
import {
  fetchJobResult,
  isVideoConfigured,
  persistVideo,
  submitVideoJob,
} from "@/lib/video/fal";
import { getOwnedRestaurant } from "../actions";

function monthStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

/** Generările folosite luna aceasta (tot ce nu a eșuat consumă din cotă). */
export async function videosUsedThisMonth(restaurantId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("video_jobs")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .neq("status", "failed")
    .gte("created_at", monthStart());
  return count ?? 0;
}

export async function generateVideo(formData: FormData) {
  const restaurant = await getOwnedRestaurant();
  if (!restaurant) redirect("/app");

  if (!isVideoConfigured()) {
    redirect(
      `/app/video?error=${encodeURIComponent("Generarea video nu este configurată încă (lipsește cheia fal.ai).")}`
    );
  }

  const itemId = String(formData.get("item_id") ?? "");
  const customPrompt = String(formData.get("prompt") ?? "").trim();
  const requestedRatio = String(formData.get("aspect_ratio") ?? "16:9");
  // Exportul vertical e beneficiu de plan Pro (trial-ul îl are ca demo).
  const canVertical = restaurant.plan === "pro" || restaurant.plan === "trial";
  const aspectRatio = (
    requestedRatio === "9:16" && canVertical ? "9:16" : "16:9"
  ) as "16:9" | "9:16";

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("menu_items")
    .select("id, image_url, name")
    .eq("id", itemId)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();

  if (!item?.image_url) {
    redirect(
      `/app/video?error=${encodeURIComponent("Preparatul are nevoie de o poză înainte de a genera un clip.")}`
    );
  }

  const used = await videosUsedThisMonth(restaurant.id);
  const limit = PLANS[restaurant.plan].videosPerMonth;
  if (used >= limit) {
    redirect(
      `/app/video?error=${encodeURIComponent(`Ai folosit toate cele ${limit} generări din planul ${PLANS[restaurant.plan].name} luna aceasta. Treci la un plan superior din pagina Abonament.`)}`
    );
  }

  // Creăm întâi jobul, ca să nu pierdem evidența dacă submit-ul reușește
  // dar răspunsul se pierde.
  const { data: job, error: insertError } = await supabase
    .from("video_jobs")
    .insert({
      restaurant_id: restaurant.id,
      menu_item_id: item.id,
      source_image_url: item.image_url,
      prompt: customPrompt || null,
      aspect_ratio: aspectRatio,
    })
    .select("id")
    .single();
  if (insertError || !job) {
    redirect(`/app/video?error=${encodeURIComponent("Nu am putut crea jobul.")}`);
  }

  try {
    const requestId = await submitVideoJob({
      imageUrl: item.image_url,
      prompt: customPrompt || undefined,
      aspectRatio,
    });
    await supabase
      .from("video_jobs")
      .update({ provider_request_id: requestId, status: "processing" })
      .eq("id", job.id);
  } catch (e) {
    await supabase
      .from("video_jobs")
      .update({
        status: "failed",
        error: e instanceof Error ? e.message : "Trimiterea către fal.ai a eșuat",
      })
      .eq("id", job.id);
    redirect(
      `/app/video?error=${encodeURIComponent("Trimiterea către fal.ai a eșuat — verifică cheia FAL_KEY.")}`
    );
  }

  revalidatePath("/app/video");
  redirect("/app/video");
}

/** Fallback manual: interoghează fal.ai pentru un job încă în procesare
 *  (util în dezvoltare, unde webhook-ul nu poate ajunge la localhost). */
export async function refreshJob(formData: FormData) {
  const restaurant = await getOwnedRestaurant();
  if (!restaurant) redirect("/app");

  const jobId = String(formData.get("job_id") ?? "");
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("video_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();

  if (job?.provider_request_id && job.status === "processing") {
    try {
      const result = await fetchJobResult(job.provider_request_id);
      if (result.status === "done" && result.videoUrl) {
        const publicUrl = await persistVideo(result.videoUrl, restaurant.id, job.id);
        const admin = createAdminClient();
        await admin
          .from("video_jobs")
          .update({
            status: "done",
            result_video_url: publicUrl,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        // Doar clipurile 16:9 intră în meniu; cele verticale sunt pentru
        // social media și rămân descărcabile din istoric.
        if (job.menu_item_id && job.aspect_ratio !== "9:16") {
          await admin
            .from("menu_items")
            .update({ video_url: publicUrl })
            .eq("id", job.menu_item_id);
        }
      } else if (result.status === "failed") {
        await supabase
          .from("video_jobs")
          .update({ status: "failed", error: result.error ?? "Generare eșuată" })
          .eq("id", job.id);
      }
    } catch {
      // Interogarea a eșuat — jobul rămâne în procesare, se poate reîncerca.
    }
  }

  revalidatePath("/app/video");
  redirect("/app/video");
}
