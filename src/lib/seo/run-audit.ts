import { createAdminClient } from "@/lib/supabase/admin";
import type { SeoResults } from "@/lib/types";
import { runOnPageChecks, scoreChecks } from "./checks";
import { fetchLighthouseScores } from "./psi";

/**
 * Rulează auditul complet pentru un rând din seo_audits și salvează
 * rezultatul. Aruncă doar dacă nici măcar pagina nu a putut fi accesată.
 */
export async function runAudit(auditId: string, url: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("seo_audits").update({ status: "running" }).eq("id", auditId);

  try {
    // Verificările proprii și Lighthouse rulează în paralel.
    const [onPage, lighthouse] = await Promise.all([
      runOnPageChecks(url),
      fetchLighthouseScores(url),
    ]);

    const onPageScore = scoreChecks(onPage.checks);
    // Media dintre scorul on-page și media Lighthouse (dacă e disponibil).
    const lhValues = lighthouse
      ? [lighthouse.performance, lighthouse.seo].filter(
          (v): v is number => typeof v === "number"
        )
      : [];
    const score =
      lhValues.length > 0
        ? Math.round(
            (onPageScore + lhValues.reduce((a, b) => a + b, 0) / lhValues.length) / 2
          )
        : onPageScore;

    const results: SeoResults = {
      finalUrl: onPage.finalUrl,
      fetchedAt: new Date().toISOString(),
      responseTimeMs: onPage.responseTimeMs,
      checks: onPage.checks,
      lighthouse: lighthouse ?? undefined,
    };

    await admin
      .from("seo_audits")
      .update({
        status: "done",
        score,
        results,
        completed_at: new Date().toISOString(),
      })
      .eq("id", auditId);
  } catch (e) {
    await admin
      .from("seo_audits")
      .update({
        status: "failed",
        error:
          e instanceof Error
            ? e.message
            : "Site-ul nu a putut fi accesat pentru analiză.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", auditId);
    throw e;
  }
}
