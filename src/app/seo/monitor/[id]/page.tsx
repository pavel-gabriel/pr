import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateMonitorReport,
  type SeoMonitor,
  type SeoReport,
} from "@/lib/seo/monitor";

export const metadata = { title: "Monitorizare SEO" };

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-neutral-400">—</span>;
  const color =
    score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-500" : "text-red-500";
  return <span className={`font-bold ${color}`}>{score}</span>;
}

function Delta({ report }: { report: SeoReport }) {
  if (report.score === null || report.previous_score === null) return null;
  const delta = report.score - report.previous_score;
  if (delta === 0) return <span className="text-xs text-neutral-400">=</span>;
  return delta > 0 ? (
    <span className="text-xs font-medium text-emerald-600">▲ +{delta}</span>
  ) : (
    <span className="text-xs font-medium text-red-500">▼ {delta}</span>
  );
}

export default async function MonitorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ platit?: string; deja?: string }>;
}) {
  const { id } = await params;
  const { platit, deja } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const admin = createAdminClient();
  const { data } = await admin
    .from("seo_monitors")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const monitor = data as SeoMonitor | null;
  if (!monitor) notFound();

  // Prima vizită după plată: generăm raportul inițial pe loc (durează
  // ~20-30s — același model ca auditul gratuit).
  let { data: reportRows } = await admin
    .from("seo_reports")
    .select("*")
    .eq("monitor_id", monitor.id)
    .order("created_at", { ascending: false });
  if (monitor.status === "active" && (reportRows ?? []).length === 0) {
    try {
      await generateMonitorReport(monitor);
      ({ data: reportRows } = await admin
        .from("seo_reports")
        .select("*")
        .eq("monitor_id", monitor.id)
        .order("created_at", { ascending: false }));
    } catch {
      // raportul poate fi reîncercat de cron / următoarea vizită
    }
  }
  const reports = (reportRows ?? []) as SeoReport[];

  const statusLabel: Record<SeoMonitor["status"], string> = {
    pending_payment: "În așteptarea plății",
    active: "Activă",
    canceled: "Anulată",
    expired: monitor.billing === "one_time" ? "Raport unic finalizat" : "Expirată",
  };

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
        {platit && (
          <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            ✅ Plata a fost confirmată — mulțumim! Primul raport se generează
            mai jos (durează ~30 de secunde; reîncarcă pagina dacă nu apare).
          </p>
        )}
        {deja && (
          <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Ai deja un abonament activ de monitorizare pentru acest site — el
            e afișat mai jos.
          </p>
        )}

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Monitorizare SEO</h1>
              <p className="mt-1 break-all text-neutral-600">{monitor.url}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                monitor.status === "active"
                  ? "bg-emerald-50 text-emerald-700"
                  : monitor.status === "pending_payment"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {statusLabel[monitor.status]}
              {monitor.billing === "subscription" ? " · abonament lunar" : " · la cerere"}
            </span>
          </div>

          {monitor.status === "pending_payment" && (
            <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Plata nu a fost încă înregistrată. Dacă ai finalizat-o acum,
              așteaptă câteva secunde și reîncarcă pagina.
            </p>
          )}

          {monitor.status === "active" && monitor.billing === "subscription" && (
            <p className="mt-4 text-sm text-neutral-600">
              Un audit complet rulează automat în fiecare lună, iar raportul cu
              evoluția scorului ajunge pe {monitor.email}.
              {monitor.paid_until &&
                ` Perioada curentă e plătită până pe ${new Date(monitor.paid_until).toLocaleDateString("ro-RO")}.`}
            </p>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Evoluția scorului</h2>
          {reports.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Încă nu există rapoarte.{" "}
              {monitor.status === "active"
                ? "Primul se generează la prima vizită a acestei pagini — reîncarcă în ~30 de secunde."
                : ""}
            </p>
          ) : (
            <div className="space-y-2">
              {reports.map((report, i) => (
                <Link
                  key={report.id}
                  href={`/seo/raport/${report.audit_id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 px-4 py-3 hover:border-emerald-200"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(report.created_at).toLocaleDateString("ro-RO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {i === 0 && (
                        <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                          cel mai recent
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-500">Vezi raportul complet →</p>
                  </div>
                  <p className="flex items-baseline gap-2 text-2xl">
                    <ScoreBadge score={report.score} />
                    <span className="text-sm text-neutral-400">/100</span>
                    <Delta report={report} />
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Întrebări sau modificări ale abonamentului? Scrie-ne la{" "}
          <a href="mailto:contact@ftfconsulting.ro" className="underline">
            contact@ftfconsulting.ro
          </a>
          .
        </p>
      </div>
    </main>
  );
}
