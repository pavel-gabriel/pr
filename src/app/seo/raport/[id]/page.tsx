import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SeoAudit, SeoCheck } from "@/lib/types";
import { requestOffer } from "../../actions";

export const metadata = { title: "Raport SEO" };

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-500" : "text-red-500";
  return (
    <div className={`text-6xl font-bold ${color}`}>
      {score}
      <span className="text-2xl text-neutral-400">/100</span>
    </div>
  );
}

function CheckRow({ check }: { check: SeoCheck }) {
  return (
    <div className="flex gap-3 border-t border-neutral-100 py-3">
      <span className="mt-0.5">{check.passed ? "✅" : check.severity === "critical" ? "🔴" : "🟡"}</span>
      <div>
        <p className="font-medium">{check.label}</p>
        <p className="text-sm text-neutral-600">{check.details}</p>
        {!check.passed && check.recommendation && (
          <p className="mt-1 text-sm text-emerald-800">
            <span className="font-medium">Recomandare:</span> {check.recommendation}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { id } = await params;
  const { sent, error } = await searchParams;

  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const admin = createAdminClient();
  const { data } = await admin
    .from("seo_audits")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const audit = data as SeoAudit | null;
  if (!audit) notFound();

  const failed = audit.status === "failed";
  const results = audit.results;
  const failedChecks = results?.checks.filter((c) => !c.passed) ?? [];
  const passedChecks = results?.checks.filter((c) => c.passed) ?? [];

  return (
    <main className="min-h-screen bg-neutral-50 pb-16">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            FTF<span className="text-emerald-600"> Consulting</span>
          </Link>
          <Link href="/seo" className="text-sm hover:text-emerald-600">
            Analizează alt site
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-10">
        {failed ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold">Nu am putut analiza site-ul</h1>
            <p className="mt-2 text-neutral-600">{audit.error}</p>
            <Link
              href="/seo"
              className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-2.5 font-medium text-white hover:bg-emerald-700"
            >
              Încearcă din nou
            </Link>
          </div>
        ) : audit.status !== "done" || !results ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold">Analiza rulează…</h1>
            <p className="mt-2 text-neutral-600">
              Reîncarcă pagina în câteva secunde.
            </p>
          </div>
        ) : (
          <>
            {/* Scor */}
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <p className="text-sm uppercase tracking-wide text-neutral-500">
                Scor SEO pentru
              </p>
              <p className="mb-4 break-all font-medium">{results.finalUrl}</p>
              <ScoreRing score={audit.score ?? 0} />
              {results.lighthouse && (
                <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  {(
                    [
                      ["Performanță", results.lighthouse.performance],
                      ["SEO", results.lighthouse.seo],
                      ["Accesibilitate", results.lighthouse.accessibility],
                      ["Bune practici", results.lighthouse.bestPractices],
                    ] as const
                  ).map(
                    ([label, value]) =>
                      typeof value === "number" && (
                        <div key={label} className="rounded-lg bg-neutral-50 p-3">
                          <p className="text-2xl font-bold">{value}</p>
                          <p className="text-xs text-neutral-500">{label}</p>
                        </div>
                      )
                  )}
                </div>
              )}
            </div>

            {/* Probleme găsite */}
            {failedChecks.length > 0 && (
              <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold">
                  Probleme găsite ({failedChecks.length})
                </h2>
                {failedChecks.map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </section>
            )}

            {/* CTA ofertă */}
            <section className="mt-8 rounded-xl border-2 border-emerald-600 bg-white p-6 shadow-sm">
              {sent ? (
                <div className="text-center">
                  <h2 className="text-lg font-bold text-emerald-700">
                    ✅ Cererea a fost trimisă!
                  </h2>
                  <p className="mt-2 text-neutral-600">
                    Te contactăm în maximum 24 de ore lucrătoare cu o ofertă
                    concretă.
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold">
                    Vrei să rezolvăm noi problemele astea?
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Lasă-ne datele și primești o ofertă cu preț fix pentru
                    reparațiile tehnice, sau un abonament lunar de optimizare cu
                    re-analiză automată care îți arată progresul.
                  </p>
                  {error && (
                    <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                      {error}
                    </p>
                  )}
                  <form action={requestOffer} className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="audit_id" value={audit.id} />
                    <input
                      name="name"
                      required
                      placeholder="Numele tău *"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <input
                      name="email"
                      type="email"
                      required
                      defaultValue={audit.email}
                      placeholder="Email *"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <input
                      name="phone"
                      type="tel"
                      placeholder="Telefon (opțional)"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <input
                      name="message"
                      placeholder="Ce te interesează? (opțional)"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <button className="rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 sm:col-span-2">
                      Cere ofertă gratuită
                    </button>
                  </form>
                </>
              )}
            </section>

            {/* Verificări trecute */}
            {passedChecks.length > 0 && (
              <details className="mt-8 rounded-xl bg-white p-6 shadow-sm">
                <summary className="cursor-pointer text-lg font-bold">
                  Ce e deja în regulă ({passedChecks.length})
                </summary>
                {passedChecks.map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </details>
            )}

            <p className="mt-6 text-center text-xs text-neutral-400">
              Analiză efectuată la{" "}
              {new Date(results.fetchedAt).toLocaleString("ro-RO")} · timp de
              răspuns {results.responseTimeMs}ms
            </p>
          </>
        )}
      </div>
    </main>
  );
}
