import type { SeoCheck } from "@/lib/types";

const FETCH_TIMEOUT_MS = 15000;
const UA =
  "Mozilla/5.0 (compatible; FTFAuditBot/1.0; +https://ftfconsulting.ro)";

async function timedFetch(url: string, accept = "text/html") {
  const started = Date.now();
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: accept },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  return { res, elapsedMs: Date.now() - started };
}

function extract(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function countMatches(html: string, regex: RegExp): number {
  return (html.match(regex) ?? []).length;
}

export interface OnPageResult {
  finalUrl: string;
  responseTimeMs: number;
  checks: SeoCheck[];
}

/** Verificările on-page proprii (fără Lighthouse). */
export async function runOnPageChecks(inputUrl: string): Promise<OnPageResult> {
  const url = inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`;
  const { res, elapsedMs } = await timedFetch(url);
  if (!res.ok) {
    throw new Error(`Site-ul a răspuns cu ${res.status} ${res.statusText}`);
  }
  const finalUrl = res.url;
  const html = (await res.text()).slice(0, 1_500_000);
  const checks: SeoCheck[] = [];

  const add = (check: SeoCheck) => checks.push(check);

  // HTTPS
  add({
    id: "https",
    label: "Conexiune securizată (HTTPS)",
    passed: finalUrl.startsWith("https://"),
    severity: "critical",
    details: finalUrl.startsWith("https://")
      ? "Site-ul se încarcă prin HTTPS."
      : "Site-ul nu folosește HTTPS — Google penalizează site-urile nesecurizate.",
    recommendation: finalUrl.startsWith("https://")
      ? undefined
      : "Instalează un certificat SSL (gratuit prin Let's Encrypt) și redirecționează tot traficul HTTP către HTTPS.",
  });

  // Timp de răspuns
  add({
    id: "response-time",
    label: "Timp de răspuns al serverului",
    passed: elapsedMs < 1500,
    severity: "warning",
    details: `Pagina a răspuns în ${elapsedMs}ms.`,
    recommendation:
      elapsedMs < 1500
        ? undefined
        : "Peste 1,5s până la primul răspuns — activează caching-ul sau schimbă hostingul.",
  });

  // Title
  const title = extract(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  add({
    id: "title",
    label: "Titlul paginii (<title>)",
    passed: !!title && title.length >= 10 && title.length <= 65,
    severity: "critical",
    details: title
      ? `„${title.slice(0, 80)}” (${title.length} caractere)`
      : "Pagina nu are titlu.",
    recommendation:
      title && title.length >= 10 && title.length <= 65
        ? undefined
        : "Scrie un titlu de 10–65 de caractere care conține serviciul și orașul (ex: „Restaurant italian în Cluj — Trattoria Bella”).",
  });

  // Meta description
  const metaDesc = extract(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
  ) ?? extract(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  add({
    id: "meta-description",
    label: "Meta descriere",
    passed: !!metaDesc && metaDesc.length >= 50 && metaDesc.length <= 165,
    severity: "critical",
    details: metaDesc
      ? `${metaDesc.length} caractere.`
      : "Lipsește meta descrierea — Google afișează text aleatoriu din pagină.",
    recommendation:
      metaDesc && metaDesc.length >= 50 && metaDesc.length <= 165
        ? undefined
        : "Adaugă o meta descriere de 50–165 de caractere care convinge utilizatorul să dea click.",
  });

  // H1
  const h1Count = countMatches(html, /<h1[\s>]/gi);
  add({
    id: "h1",
    label: "Un singur titlu principal (H1)",
    passed: h1Count === 1,
    severity: "warning",
    details: `Pagina are ${h1Count} elemente H1.`,
    recommendation:
      h1Count === 1
        ? undefined
        : h1Count === 0
          ? "Adaugă un H1 cu subiectul principal al paginii."
          : "Păstrează un singur H1 pe pagină; folosește H2/H3 pentru restul.",
  });

  // Structură heading-uri
  const h2Count = countMatches(html, /<h2[\s>]/gi);
  add({
    id: "headings",
    label: "Structura de subtitluri (H2)",
    passed: h2Count >= 1,
    severity: "info",
    details: `Pagina are ${h2Count} elemente H2.`,
    recommendation:
      h2Count >= 1
        ? undefined
        : "Împarte conținutul în secțiuni cu subtitluri H2 — ajută și cititorii, și Google.",
  });

  // Alt pe imagini
  const imgCount = countMatches(html, /<img[\s>]/gi);
  const imgNoAlt =
    imgCount -
    countMatches(html, /<img[^>]*\balt=["'][^"']+["'][^>]*>/gi);
  add({
    id: "img-alt",
    label: "Texte alternative la imagini",
    passed: imgCount === 0 || imgNoAlt === 0,
    severity: "warning",
    details:
      imgCount === 0
        ? "Pagina nu are imagini."
        : `${imgNoAlt} din ${imgCount} imagini nu au atribut alt.`,
    recommendation:
      imgCount === 0 || imgNoAlt === 0
        ? undefined
        : "Adaugă atribute alt descriptive la imagini — sunt folosite de Google Images și de cititoarele de ecran.",
  });

  // Viewport (mobile)
  add({
    id: "viewport",
    label: "Optimizare pentru mobil (viewport)",
    passed: /<meta[^>]+name=["']viewport["']/i.test(html),
    severity: "critical",
    details: /<meta[^>]+name=["']viewport["']/i.test(html)
      ? "Meta viewport este prezent."
      : "Lipsește meta viewport — pagina nu e adaptată pentru mobil.",
    recommendation: /<meta[^>]+name=["']viewport["']/i.test(html)
      ? undefined
      : 'Adaugă <meta name="viewport" content="width=device-width, initial-scale=1"> și verifică design-ul responsive.',
  });

  // Lang
  add({
    id: "lang",
    label: "Limba declarată (atribut lang)",
    passed: /<html[^>]+lang=["'][a-z]/i.test(html),
    severity: "info",
    details: /<html[^>]+lang=["'][a-z]/i.test(html)
      ? "Atributul lang este setat."
      : "Elementul <html> nu declară limba conținutului.",
    recommendation: /<html[^>]+lang=["'][a-z]/i.test(html)
      ? undefined
      : 'Adaugă lang="ro" pe elementul <html>.',
  });

  // Open Graph
  const hasOg =
    /<meta[^>]+property=["']og:title["']/i.test(html) &&
    /<meta[^>]+property=["']og:image["']/i.test(html);
  add({
    id: "open-graph",
    label: "Previzualizare la distribuire (Open Graph)",
    passed: hasOg,
    severity: "info",
    details: hasOg
      ? "Tag-urile og:title și og:image sunt prezente."
      : "Lipsesc tag-urile Open Graph — link-ul arată gol când e distribuit pe WhatsApp/Facebook.",
    recommendation: hasOg
      ? undefined
      : "Adaugă og:title, og:description și og:image pentru o previzualizare atrăgătoare la share.",
  });

  // Date structurate
  add({
    id: "structured-data",
    label: "Date structurate (schema.org)",
    passed: /application\/ld\+json/i.test(html),
    severity: "warning",
    details: /application\/ld\+json/i.test(html)
      ? "Pagina conține date structurate JSON-LD."
      : "Nu am găsit date structurate.",
    recommendation: /application\/ld\+json/i.test(html)
      ? undefined
      : "Adaugă schema.org (LocalBusiness/Restaurant) în JSON-LD — Google poate afișa stele, program și adresă direct în rezultate.",
  });

  // Canonical
  add({
    id: "canonical",
    label: "URL canonic",
    passed: /<link[^>]+rel=["']canonical["']/i.test(html),
    severity: "info",
    details: /<link[^>]+rel=["']canonical["']/i.test(html)
      ? "Link-ul canonical este prezent."
      : "Lipsește link-ul canonical.",
    recommendation: /<link[^>]+rel=["']canonical["']/i.test(html)
      ? undefined
      : "Adaugă <link rel=\"canonical\"> ca să eviți conținutul duplicat (www vs non-www, parametri).",
  });

  // Conținut suficient
  const textOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const wordCount = textOnly.split(/\s+/).filter((w) => w.length > 2).length;
  add({
    id: "content-length",
    label: "Volum de conținut",
    passed: wordCount >= 250,
    severity: "warning",
    details: `~${wordCount} cuvinte vizibile pe pagină.`,
    recommendation:
      wordCount >= 250
        ? undefined
        : "Sub 250 de cuvinte — Google tratează pagina drept conținut subțire. Adaugă descrieri ale serviciilor, întrebări frecvente, recenzii.",
  });

  // robots.txt & sitemap
  const origin = new URL(finalUrl).origin;
  let robotsOk = false;
  let robotsBody = "";
  try {
    const { res: robotsRes } = await timedFetch(`${origin}/robots.txt`, "text/plain");
    robotsOk = robotsRes.ok;
    if (robotsRes.ok) robotsBody = await robotsRes.text();
  } catch {
    // robots.txt inaccesibil
  }
  add({
    id: "robots",
    label: "Fișier robots.txt",
    passed: robotsOk,
    severity: "info",
    details: robotsOk ? "robots.txt există." : "robots.txt lipsește sau nu răspunde.",
    recommendation: robotsOk
      ? undefined
      : "Publică un robots.txt minimal care permite indexarea și indică sitemap-ul.",
  });

  let sitemapOk = /sitemap/i.test(robotsBody);
  if (!sitemapOk) {
    try {
      const { res: sitemapRes } = await timedFetch(`${origin}/sitemap.xml`, "application/xml");
      sitemapOk = sitemapRes.ok;
    } catch {
      // sitemap inaccesibil
    }
  }
  add({
    id: "sitemap",
    label: "Sitemap XML",
    passed: sitemapOk,
    severity: "warning",
    details: sitemapOk
      ? "Sitemap-ul există (sau e declarat în robots.txt)."
      : "Nu am găsit sitemap.xml.",
    recommendation: sitemapOk
      ? undefined
      : "Generează un sitemap.xml și trimite-l în Google Search Console — paginile noi vor fi indexate mai repede.",
  });

  return { finalUrl, responseTimeMs: elapsedMs, checks };
}

/** Scor 0–100 din verificările on-page, ponderat după severitate. */
export function scoreChecks(checks: SeoCheck[]): number {
  const weight = { critical: 3, warning: 2, info: 1 } as const;
  const total = checks.reduce((sum, c) => sum + weight[c.severity], 0);
  const earned = checks.reduce(
    (sum, c) => sum + (c.passed ? weight[c.severity] : 0),
    0
  );
  return total === 0 ? 0 : Math.round((earned / total) * 100);
}
