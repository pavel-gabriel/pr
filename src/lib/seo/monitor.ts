import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { runAudit } from "./run-audit";

/** Prețurile monitorizării SEO (RON) — trimise inline către Stripe. */
export const SEO_MONITOR_PRICES = {
  /** Raport de monitorizare unic, la cerere. */
  oneTimeRon: 49,
  /** Abonament lunar: raport automat în fiecare lună. */
  monthlyRon: 79,
} as const;

export interface SeoMonitor {
  id: string;
  owner_id: string | null;
  audit_id: string | null;
  url: string;
  email: string;
  billing: "one_time" | "subscription";
  status: "pending_payment" | "active" | "canceled" | "expired";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  paid_until: string | null;
  last_report_at: string | null;
  created_at: string;
}

export interface SeoReport {
  id: string;
  monitor_id: string;
  audit_id: string;
  score: number | null;
  previous_score: number | null;
  created_at: string;
}

function monitorUrl(monitorId: string): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/seo/monitor/${monitorId}`;
}

/**
 * Rulează o rundă de monitorizare: audit complet nou, raport cu delta față
 * de runda anterioară și email către client. Pentru plata unică, monitorul
 * se închide (expired) după raportul plătit.
 */
export async function generateMonitorReport(monitor: SeoMonitor): Promise<string> {
  const admin = createAdminClient();

  const { data: previous } = await admin
    .from("seo_reports")
    .select("score")
    .eq("monitor_id", monitor.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // Prima rundă se compară cu auditul gratuit din care s-a pornit.
  let previousScore: number | null = previous?.score ?? null;
  if (previousScore === null && monitor.audit_id) {
    const { data: baseAudit } = await admin
      .from("seo_audits")
      .select("score")
      .eq("id", monitor.audit_id)
      .maybeSingle();
    previousScore = baseAudit?.score ?? null;
  }

  const { data: audit, error } = await admin
    .from("seo_audits")
    .insert({ url: monitor.url, email: monitor.email })
    .select("id")
    .single();
  if (error || !audit) throw new Error("Nu am putut porni auditul de monitorizare.");

  await runAudit(audit.id, monitor.url);

  const { data: finished } = await admin
    .from("seo_audits")
    .select("score")
    .eq("id", audit.id)
    .maybeSingle();
  const score = finished?.score ?? null;

  const { data: report } = await admin
    .from("seo_reports")
    .insert({
      monitor_id: monitor.id,
      audit_id: audit.id,
      score,
      previous_score: previousScore,
    })
    .select("id")
    .single();

  await admin
    .from("seo_monitors")
    .update({
      last_report_at: new Date().toISOString(),
      // Raportul unic e consumat — monitorul se închide, pagina rămâne.
      ...(monitor.billing === "one_time" ? { status: "expired" } : {}),
    })
    .eq("id", monitor.id);

  const delta =
    score !== null && previousScore !== null ? score - previousScore : null;
  const deltaText =
    delta === null
      ? ""
      : delta > 0
        ? ` (▲ +${delta} față de raportul anterior — felicitări!)`
        : delta < 0
          ? ` (▼ ${delta} față de raportul anterior — vezi ce s-a schimbat)`
          : " (neschimbat față de raportul anterior)";

  await sendEmail(
    monitor.email,
    `Raportul lunar SEO pentru ${monitor.url}: scor ${score ?? "—"}/100`,
    [
      "Salut!",
      "",
      `Monitorizarea SEO pentru ${monitor.url} a rulat.`,
      `Scor: ${score ?? "—"}/100${deltaText}`,
      "",
      `Raportul complet: ${process.env.NEXT_PUBLIC_SITE_URL}/seo/raport/${audit.id}`,
      `Istoricul monitorizării: ${monitorUrl(monitor.id)}`,
      "",
      monitor.billing === "subscription"
        ? "Următorul raport vine automat luna viitoare."
        : "Acesta a fost raportul tău la cerere — poți activa oricând abonamentul lunar din pagina monitorizării.",
      "",
      "Dacă vrei să rezolvăm noi problemele găsite, răspunde la acest email.",
      "FTF Consulting · ftfconsulting.ro",
    ].join("\n")
  );

  return report?.id ?? audit.id;
}

/** Monitorizările cu raport scadent (activ + plătit + >28 zile de la ultimul). */
export async function findDueMonitors(limit = 5): Promise<SeoMonitor[]> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await admin
    .from("seo_monitors")
    .select("*")
    .eq("status", "active")
    .or(`last_report_at.is.null,last_report_at.lt.${cutoff}`)
    .order("last_report_at", { ascending: true, nullsFirst: true })
    .limit(limit * 2);

  // paid_until în trecut → nu mai generăm (webhook-ul va marca statusul).
  return ((data ?? []) as SeoMonitor[])
    .filter((m) => !m.paid_until || m.paid_until > now)
    .slice(0, limit);
}
