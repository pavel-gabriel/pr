import { NextResponse } from "next/server";
import { findDueMonitors, generateMonitorReport } from "@/lib/seo/monitor";

export const maxDuration = 300;

/**
 * Cron-ul de monitorizare SEO: generează rapoartele scadente (max 5 pe
 * rulare, ca să încapă în timpul de execuție). Rulează-l zilnic — fiecare
 * monitor primește raport doar dacă au trecut 28 de zile de la ultimul.
 *
 * Autorizare: header `Authorization: Bearer $CRON_SECRET` (Vercel Cron îl
 * trimite automat) sau `?secret=$CRON_SECRET` pentru cron extern.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET neconfigurat" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  if (auth !== `Bearer ${secret}` && url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const due = await findDueMonitors(5);
  const results: { monitor: string; url: string; ok: boolean; error?: string }[] = [];

  // Secvențial — PSI are rate limits, iar rulările sunt puține per batch.
  for (const monitor of due) {
    try {
      await generateMonitorReport(monitor);
      results.push({ monitor: monitor.id, url: monitor.url, ok: true });
    } catch (e) {
      results.push({
        monitor: monitor.id,
        url: monitor.url,
        ok: false,
        error: e instanceof Error ? e.message : "eroare",
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
