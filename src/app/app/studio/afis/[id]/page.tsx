import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { POSTER_FORMATS, POSTER_STYLES, type PosterFormat, type PosterStyle } from "@/lib/poster";
import { PosterTools } from "./poster-tools";

export const metadata = { title: "Afișul tău" };

export default async function PosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/studio");

  const { data: poster } = await supabase
    .from("promo_posters")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!poster) notFound();

  const format = POSTER_FORMATS[poster.format as PosterFormat];
  const content = poster.content as { headline?: string };

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-4 text-sm text-neutral-500">
        <Link href="/app/studio" className="hover:text-emerald-700">
          ← Înapoi la Studio
        </Link>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Afișul tău e gata 🎉</h1>
          <p className="text-sm text-neutral-600">
            {format.label} · stil {POSTER_STYLES[poster.style as PosterStyle].label.split(" — ")[0]}
            {content.headline ? ` · „${content.headline}”` : ""}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG generat dinamic, fără dimensiuni fixe de optimizat */}
        <img
          src={poster.svg_url}
          alt="Previzualizarea afișului"
          className="mx-auto max-h-[70vh] w-auto rounded-lg border border-neutral-100"
        />
      </div>

      <PosterTools
        svgUrl={poster.svg_url}
        width={format.width}
        height={format.height}
        filename={`afis-${poster.format}`}
      />

      <p className="mt-4 text-xs text-neutral-400">
        SVG-ul e vectorial — perfect pentru tipografie la orice dimensiune.
        PNG-ul e ideal pentru postări. Pentru print rapid folosește butonul
        Printează și salvează ca PDF.
      </p>
    </div>
  );
}
