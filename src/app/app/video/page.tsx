import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import type { MenuItem, VideoJob } from "@/lib/types";
import { isVideoConfigured, DEFAULT_FOOD_PROMPT } from "@/lib/video/fal";
import { getOwnedRestaurant } from "../actions";
import { generateVideo, refreshJob, videosUsedThisMonth } from "./actions";

export const metadata = { title: "Video AI" };

const STATUS_LABELS: Record<VideoJob["status"], string> = {
  pending: "În așteptare",
  processing: "Se generează…",
  done: "Gata",
  failed: "Eșuat",
};

export default async function VideoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const restaurant = await getOwnedRestaurant();
  if (!restaurant) redirect("/app");

  const supabase = await createClient();
  const [{ data: items }, { data: jobs }, used] = await Promise.all([
    supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .not("image_url", "is", null)
      .order("created_at"),
    supabase
      .from("video_jobs")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false })
      .limit(20),
    videosUsedThisMonth(restaurant.id),
  ]);

  const menuItems = (items ?? []) as MenuItem[];
  const videoJobs = (jobs ?? []) as VideoJob[];
  const limit = PLANS[restaurant.plan].videosPerMonth;
  const remaining = Math.max(0, limit - used);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Video AI pentru preparate</h1>
        <p className="rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
          {remaining} / {limit} generări rămase luna aceasta
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!isVideoConfigured() && (
        <p className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Generarea video nu este activă încă pe acest mediu (lipsește cheia
          fal.ai). Poți pregăti meniul între timp — clipurile se generează
          imediat ce serviciul e configurat.
        </p>
      )}

      <p className="mb-6 max-w-2xl text-sm text-neutral-600">
        Alege un preparat cu poză și generăm un clip cinematic de ~5 secunde
        (cameră care orbitează în jurul farfuriei). Clipul apare automat în
        meniul public și îl poți descărca pentru Instagram, TikTok sau Google.
      </p>

      {menuItems.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-neutral-600 shadow-sm">
          Nu ai încă preparate cu poze.{" "}
          <Link href="/app/meniu" className="text-emerald-700 underline">
            Adaugă preparate în meniu
          </Link>{" "}
          și revino aici.
        </p>
      ) : (
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
              {item.image_url && (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  width={400}
                  height={225}
                  className="aspect-video w-full object-cover"
                />
              )}
              <div className="p-4">
                <p className="mb-2 font-medium">
                  {item.name}
                  {item.video_url && (
                    <span className="ml-2 rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      🎬 are video
                    </span>
                  )}
                </p>
                <form action={generateVideo} className="space-y-2">
                  <input type="hidden" name="item_id" value={item.id} />
                  <input
                    name="prompt"
                    placeholder="Instrucțiuni extra (opțional)"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-xs"
                  />
                  <button
                    className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    disabled={remaining === 0}
                  >
                    {item.video_url ? "Regenerează clipul" : "Generează clip video"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {videoJobs.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Istoricul generărilor</h2>
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Data</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Rezultat</th>
                </tr>
              </thead>
              <tbody>
                {videoJobs.map((job) => (
                  <tr key={job.id} className="border-t border-neutral-100">
                    <td className="px-4 py-2 text-neutral-600">
                      {new Date(job.created_at).toLocaleString("ro-RO")}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          job.status === "done"
                            ? "text-emerald-700"
                            : job.status === "failed"
                              ? "text-red-600"
                              : "text-amber-600"
                        }
                      >
                        {STATUS_LABELS[job.status]}
                      </span>
                      {job.error && (
                        <span className="block text-xs text-neutral-400">{job.error}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {job.status === "done" && job.result_video_url ? (
                        <a
                          href={job.result_video_url}
                          download
                          className="text-emerald-700 underline"
                        >
                          Descarcă clipul
                        </a>
                      ) : job.status === "processing" ? (
                        <form action={refreshJob}>
                          <input type="hidden" name="job_id" value={job.id} />
                          <button className="text-neutral-500 underline">
                            Verifică statusul
                          </button>
                        </form>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-neutral-400">
            Promptul implicit: „{DEFAULT_FOOD_PROMPT}”
          </p>
        </section>
      )}
    </div>
  );
}
