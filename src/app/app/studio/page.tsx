import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { STUDIO_PROMPTS, isVideoConfigured } from "@/lib/video/fal";
import { isTextAiConfigured } from "@/lib/ai";
import { getOwnedRestaurant } from "../actions";
import {
  generatePostAction,
  generateStudioVideo,
  getStudioUsage,
  refreshStudioJob,
  reviewReplyAction,
} from "./actions";

export const metadata = { title: "Studio de promovare" };

interface PromoVideo {
  id: string;
  kind: string;
  source_image_urls: string[];
  aspect_ratio: string;
  status: string;
  result_video_url: string | null;
  error: string | null;
  created_at: string;
}

interface PromoText {
  id: string;
  kind: string;
  input: Record<string, unknown>;
  result: { variants?: string[]; hashtags?: string[]; reply?: string };
  created_at: string;
}

const input =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/studio");

  const [usage, restaurant] = await Promise.all([
    getStudioUsage(),
    getOwnedRestaurant(),
  ]);

  const admin = createAdminClient();
  const [{ data: videos }, { data: texts }] = await Promise.all([
    admin
      .from("promo_videos")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("promo_texts")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const promoVideos = (videos ?? []) as PromoVideo[];
  const promoTexts = (texts ?? []) as PromoText[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Studio de promovare</h1>
          <p className="text-sm text-neutral-600">
            Video și texte de promovare pentru afacerea ta — generate cu AI.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">
            🎬 {Math.max(0, usage.videosLimit - usage.videosUsed)}/{usage.videosLimit} video
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">
            ✍️ {Math.max(0, usage.textsLimit - usage.textsUsed)}/{usage.textsLimit} texte
          </span>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}
      {ok && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          ✅ Gata! Rezultatul e mai jos, în istoricul secțiunii.
        </p>
      )}

      {/* ── Video promoțional ── */}
      <section className="mb-10 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">🎬 Video promoțional din poze</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Încarcă 1–3 poze cu locația, un produs, un joc — orice vrei să promovezi
          — și generăm un clip cinematic de ~5 secunde. Prima poză e cadrul de
          pornire al clipului.
        </p>
        {!isVideoConfigured() && (
          <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Generarea video nu e activă încă pe acest mediu (lipsește cheia fal.ai).
          </p>
        )}
        <form action={generateStudioVideo} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="kind" className="mb-1 block text-sm font-medium">
              Ce promovezi?
            </label>
            <select id="kind" name="kind" className={input}>
              {Object.entries(STUDIO_PROMPTS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="s_aspect" className="mb-1 block text-sm font-medium">
              Format
            </label>
            <select id="s_aspect" name="aspect_ratio" className={input}>
              <option value="16:9">Orizontal 16:9 (site, YouTube)</option>
              <option value="9:16">Vertical 9:16 (Reels, TikTok)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="s_images" className="mb-1 block text-sm font-medium">
              Pozele (1–3, max 5MB fiecare) *
            </label>
            <input id="s_images" name="images" type="file" accept="image/*" multiple required className="text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="s_prompt" className="mb-1 block text-sm font-medium">
              Instrucțiuni extra (opțional — altfel folosim preset-ul tipului ales)
            </label>
            <input
              id="s_prompt"
              name="prompt"
              placeholder="Ex: camera se apropie lent de vitrina cu torturi"
              className={input}
            />
          </div>
          <button className="rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 sm:col-span-2">
            Generează clipul
          </button>
        </form>

        {promoVideos.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-neutral-500">Clipurile tale</h3>
            {promoVideos.map((video) => (
              <div
                key={video.id}
                className="flex flex-wrap items-center gap-4 rounded-lg border border-neutral-100 p-3"
              >
                {video.source_image_urls[0] && (
                  <Image
                    src={video.source_image_urls[0]}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                )}
                <div className="grow text-sm">
                  <p className="font-medium">
                    {STUDIO_PROMPTS[video.kind]?.label ?? video.kind} ·{" "}
                    {video.aspect_ratio}
                  </p>
                  <p className="text-neutral-500">
                    {new Date(video.created_at).toLocaleString("ro-RO")} ·{" "}
                    {video.status === "done"
                      ? "Gata"
                      : video.status === "failed"
                        ? `Eșuat${video.error ? ` — ${video.error}` : ""}`
                        : "Se generează…"}
                  </p>
                </div>
                {video.status === "done" && video.result_video_url ? (
                  <a
                    href={video.result_video_url}
                    download
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Descarcă
                  </a>
                ) : video.status === "processing" ? (
                  <form action={refreshStudioJob}>
                    <input type="hidden" name="job_id" value={video.id} />
                    <button className="text-sm text-neutral-500 underline">
                      Verifică statusul
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Texte de promovare ── */}
      <section className="mb-10 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">✍️ Texte de promovare</h2>
        <p className="mt-1 text-sm text-neutral-600">
          3 variante de postare adaptate canalului ales, plus hashtag-uri — fără
          clișee de AI.
        </p>
        {!isTextAiConfigured() && (
          <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Generarea de texte nu e activă încă (lipsește cheia Anthropic).
          </p>
        )}
        <form action={generatePostAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            name="business_name"
            required
            defaultValue={restaurant?.name ?? ""}
            placeholder="Numele afacerii *"
            className={input}
          />
          <input
            name="business_type"
            placeholder="Tipul afacerii (restaurant, salon, service...)"
            className={input}
          />
          <textarea
            name="subject"
            required
            rows={2}
            placeholder="Ce promovezi? (ex: meniu nou de vară, reducere 20% la tuns în martie) *"
            className={`${input} sm:col-span-2`}
          />
          <select name="tone" className={input}>
            <option value="prietenos">Ton prietenos</option>
            <option value="profesionist">Ton profesionist</option>
            <option value="amuzant">Ton amuzant</option>
            <option value="elegant">Ton elegant</option>
          </select>
          <select name="channel" className={input}>
            <option>Facebook</option>
            <option>Instagram</option>
            <option>TikTok</option>
            <option>Google Business</option>
          </select>
          <button className="rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 sm:col-span-2">
            Generează 3 variante
          </button>
        </form>
      </section>

      {/* ── Răspuns la recenzii ── */}
      <section className="mb-10 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">⭐ Răspuns la recenzii Google</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Lipește recenzia unui client și primești un răspuns profesionist —
          inclusiv pentru recenziile negative, fără să te cerți cu clientul.
        </p>
        <form action={reviewReplyAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            name="business_name"
            required
            defaultValue={restaurant?.name ?? ""}
            placeholder="Numele afacerii *"
            className={input}
          />
          <select name="rating" className={input}>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} {r === 1 ? "stea" : "stele"}
              </option>
            ))}
          </select>
          <textarea
            name="review"
            required
            rows={3}
            placeholder="Textul recenziei clientului *"
            className={`${input} sm:col-span-2`}
          />
          <button className="rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 sm:col-span-2">
            Generează răspunsul
          </button>
        </form>
      </section>

      {/* ── Istoric texte ── */}
      {promoTexts.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Textele generate recent</h2>
          <div className="space-y-6">
            {promoTexts.map((text) => (
              <div key={text.id} className="border-t border-neutral-100 pt-4 first:border-t-0 first:pt-0">
                <p className="mb-2 text-xs text-neutral-400">
                  {text.kind === "postare" ? "Postare" : "Răspuns la recenzie"} ·{" "}
                  {new Date(text.created_at).toLocaleString("ro-RO")}
                  {text.kind === "postare" && text.input.channel
                    ? ` · ${String(text.input.channel)}`
                    : ""}
                </p>
                {text.result.variants ? (
                  <div className="space-y-2">
                    {text.result.variants.map((variant, i) => (
                      <textarea
                        key={i}
                        readOnly
                        rows={3}
                        defaultValue={variant}
                        className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
                      />
                    ))}
                    {text.result.hashtags && text.result.hashtags.length > 0 && (
                      <p className="text-sm text-emerald-700">
                        {text.result.hashtags.map((h) => `#${h}`).join(" ")}
                      </p>
                    )}
                  </div>
                ) : text.result.reply ? (
                  <textarea
                    readOnly
                    rows={3}
                    defaultValue={text.result.reply}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
                  />
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-neutral-400">
            Selectează textul din casetă și copiază-l unde ai nevoie.
          </p>
        </section>
      )}
    </div>
  );
}
