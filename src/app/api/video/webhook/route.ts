import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { persistVideo } from "@/lib/video/fal";

/**
 * Webhook fal.ai — apelat la finalizarea unui job de generare video.
 * Payload: { request_id, status: "OK" | "ERROR", payload | error }.
 *
 * Identificăm jobul după request_id (UUID emis de fal, imposibil de ghicit).
 */
export async function POST(request: Request) {
  let body: {
    request_id?: string;
    status?: string;
    payload?: { video?: { url?: string } };
    error?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalid" }, { status: 400 });
  }

  const requestId = body.request_id;
  if (!requestId) {
    return NextResponse.json({ error: "request_id lipsă" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: job } = await admin
    .from("video_jobs")
    .select("*")
    .eq("provider_request_id", requestId)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: "Job necunoscut" }, { status: 404 });
  }
  if (job.status === "done") {
    return NextResponse.json({ ok: true }); // livrare duplicată — idempotent
  }

  if (body.status !== "OK") {
    await admin
      .from("video_jobs")
      .update({
        status: "failed",
        error:
          typeof body.error === "string"
            ? body.error
            : "Generarea a eșuat la furnizor",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    return NextResponse.json({ ok: true });
  }

  const falVideoUrl = body.payload?.video?.url;
  if (!falVideoUrl) {
    await admin
      .from("video_jobs")
      .update({
        status: "failed",
        error: "Răspuns fără URL video",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    return NextResponse.json({ ok: true });
  }

  try {
    const publicUrl = await persistVideo(falVideoUrl, job.restaurant_id, job.id);
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
  } catch (e) {
    await admin
      .from("video_jobs")
      .update({
        status: "failed",
        error: e instanceof Error ? e.message : "Salvarea clipului a eșuat",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);
  }

  return NextResponse.json({ ok: true });
}
