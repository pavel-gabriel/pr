/** Scoruri Lighthouse prin Google PageSpeed Insights API (gratuit).
 *  Funcționează și fără cheie, dar cu limite de rată mici — setează
 *  PAGESPEED_API_KEY pentru volum. */
export async function fetchLighthouseScores(url: string): Promise<{
  performance?: number;
  seo?: number;
  accessibility?: number;
  bestPractices?: number;
} | null> {
  const endpoint = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
  );
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", "mobile");
  for (const category of ["PERFORMANCE", "SEO", "ACCESSIBILITY", "BEST_PRACTICES"]) {
    endpoint.searchParams.append("category", category);
  }
  if (process.env.PAGESPEED_API_KEY) {
    endpoint.searchParams.set("key", process.env.PAGESPEED_API_KEY);
  }

  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(45000) });
    if (!res.ok) return null;
    const data = await res.json();
    const categories = data?.lighthouseResult?.categories;
    if (!categories) return null;
    const pct = (v: unknown) =>
      typeof v === "number" ? Math.round(v * 100) : undefined;
    return {
      performance: pct(categories.performance?.score),
      seo: pct(categories.seo?.score),
      accessibility: pct(categories.accessibility?.score),
      bestPractices: pct(categories["best-practices"]?.score),
    };
  } catch {
    // PSI e best-effort — auditul merge mai departe doar cu verificările proprii.
    return null;
  }
}
