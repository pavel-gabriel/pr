import QRCode from "qrcode";

/** Formatele de afiș: A4 la 300dpi (print) și formatele social media. */
export const POSTER_FORMATS = {
  a4: { label: "A4 — pentru printat", width: 2480, height: 3508 },
  patrat: { label: "Pătrat — Facebook/Instagram", width: 1080, height: 1080 },
  story: { label: "Story/Reels — vertical", width: 1080, height: 1920 },
} as const;

export type PosterFormat = keyof typeof POSTER_FORMATS;

export const POSTER_STYLES = {
  bold: { label: "Bold — culoare plină, impact" },
  clean: { label: "Curat — fundal alb, elegant" },
  oferta: { label: "Ofertă — badge mare cu accent" },
} as const;

export type PosterStyle = keyof typeof POSTER_STYLES;

export interface PosterContent {
  businessName: string;
  headline: string;
  subtitle?: string;
  details?: string;
  cta?: string;
  qrLink?: string;
  /** data URI (base64) al pozei — inclusă direct în SVG */
  photoDataUri?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Împarte textul în maximum `maxLines` rânduri de ~`maxChars` caractere. */
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= maxChars) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.length > 0 ? lines : [text.slice(0, maxChars)];
}

function textLines(
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number,
  attrs: string
): string {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${startY + i * lineHeight}" ${attrs}>${escapeXml(line)}</text>`
    )
    .join("\n");
}

/** Culoare de contrast (alb/negru) pentru un fundal hex. */
function contrastColor(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? "#171717" : "#ffffff";
}

const FONT = "ui-sans-serif, system-ui, 'Segoe UI', Roboto, Arial, sans-serif";
const FONT_SERIF = "Georgia, 'Times New Roman', serif";

/** Generează afișul ca SVG complet (vector — perfect pentru print). */
export async function renderPosterSvg(opts: {
  format: PosterFormat;
  style: PosterStyle;
  brandColor: string;
  content: PosterContent;
}): Promise<string> {
  const { width: W, height: H } = POSTER_FORMATS[opts.format];
  const color = /^#[0-9a-fA-F]{6}$/.test(opts.brandColor)
    ? opts.brandColor
    : "#059669";
  const onColor = contrastColor(color);
  const c = opts.content;
  const u = W / 1080; // unitate de scalare (relativă la lățimea „social”)

  // QR (PNG data URI, inclus ca <image>)
  let qrDataUri: string | null = null;
  if (c.qrLink) {
    qrDataUri = await QRCode.toDataURL(c.qrLink, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: "M",
    });
  }

  const hasPhoto = Boolean(c.photoDataUri);
  const photoH = hasPhoto ? Math.round(H * 0.42) : 0;
  const pad = Math.round(64 * u);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
  );

  const isClean = opts.style === "clean";
  const bg = isClean ? "#ffffff" : color;
  const fg = isClean ? "#171717" : onColor;
  const accent = isClean ? color : onColor;
  const bodyFont = isClean ? FONT_SERIF : FONT;

  parts.push(`<rect width="${W}" height="${H}" fill="${bg}"/>`);

  // Poza sus (decupată pe lățime)
  if (hasPhoto) {
    parts.push(
      `<image href="${c.photoDataUri}" x="0" y="0" width="${W}" height="${photoH}" preserveAspectRatio="xMidYMid slice"/>`
    );
    // bandă de tranziție
    parts.push(
      `<rect x="0" y="${photoH - 8 * u}" width="${W}" height="${16 * u}" fill="${bg}" opacity="0.9"/>`
    );
  }

  let y = (hasPhoto ? photoH : 0) + pad + 60 * u;

  // Numele afacerii
  parts.push(
    `<text x="${pad}" y="${y}" font-family="${FONT}" font-size="${34 * u}" font-weight="600" letter-spacing="${6 * u}" fill="${accent}">${escapeXml(c.businessName.toUpperCase())}</text>`
  );
  if (isClean) {
    parts.push(
      `<rect x="${pad}" y="${y + 18 * u}" width="${120 * u}" height="${6 * u}" fill="${color}"/>`
    );
  }
  y += 100 * u;

  // Headline
  const headlineSize = opts.format === "story" ? 88 * u : 76 * u;
  const headlineLines = wrapText(c.headline, opts.format === "story" ? 14 : 18, 3);
  if (opts.style === "oferta") {
    // badge-cerc cu prima linie a headline-ului
    const badgeR = Math.round(200 * u);
    const badgeX = W - pad - badgeR;
    const badgeY = (hasPhoto ? photoH : Math.round(H * 0.18)) + badgeR * 0.4;
    parts.push(
      `<circle cx="${badgeX}" cy="${badgeY}" r="${badgeR}" fill="${isClean ? color : "#ffffff"}" opacity="0.96"/>`
    );
    const badgeLines = wrapText(c.headline, 10, 3);
    const badgeFg = isClean ? contrastColor(color) : color;
    const badgeLh = 58 * u;
    const badgeStart = badgeY - ((badgeLines.length - 1) * badgeLh) / 2 + 18 * u;
    parts.push(
      textLines(
        badgeLines,
        badgeX,
        badgeStart,
        badgeLh,
        `font-family="${FONT}" font-size="${52 * u}" font-weight="800" fill="${badgeFg}" text-anchor="middle"`
      )
    );
    y += 40 * u;
  } else {
    parts.push(
      textLines(
        headlineLines,
        pad,
        y + headlineSize,
        headlineSize * 1.12,
        `font-family="${bodyFont}" font-size="${headlineSize}" font-weight="800" fill="${fg}"`
      )
    );
    y += headlineLines.length * headlineSize * 1.12 + 50 * u;
  }

  // Subtitle
  if (c.subtitle) {
    const subLines = wrapText(c.subtitle, opts.format === "story" ? 26 : 34, 3);
    parts.push(
      textLines(
        subLines,
        pad,
        y + 40 * u,
        52 * u,
        `font-family="${bodyFont}" font-size="${38 * u}" fill="${fg}" opacity="0.92"`
      )
    );
    y += subLines.length * 52 * u + 60 * u;
  }

  // Detalii (dată, adresă, program)
  if (c.details) {
    const detailLines = wrapText(c.details, opts.format === "story" ? 30 : 42, 3);
    parts.push(
      textLines(
        detailLines,
        pad,
        y + 34 * u,
        44 * u,
        `font-family="${FONT}" font-size="${30 * u}" fill="${fg}" opacity="0.8"`
      )
    );
  }

  // Zona de jos: CTA + QR
  const bottomY = H - pad;
  if (c.cta) {
    const ctaFontSize = 34 * u;
    const ctaText = c.cta.toUpperCase();
    const ctaW = Math.min(W - 2 * pad - (qrDataUri ? 260 * u : 0), ctaText.length * ctaFontSize * 0.66 + 80 * u);
    const ctaH = 92 * u;
    const ctaFill = isClean ? color : "#ffffff";
    const ctaFg = isClean ? contrastColor(color) : color;
    parts.push(
      `<rect x="${pad}" y="${bottomY - ctaH}" width="${ctaW}" height="${ctaH}" rx="${ctaH / 2}" fill="${ctaFill}"/>`,
      `<text x="${pad + ctaW / 2}" y="${bottomY - ctaH / 2 + 12 * u}" font-family="${FONT}" font-size="${ctaFontSize}" font-weight="700" fill="${ctaFg}" text-anchor="middle">${escapeXml(ctaText)}</text>`
    );
  }
  if (qrDataUri) {
    const qrSize = 200 * u;
    const boxPad = 16 * u;
    const qrX = W - pad - qrSize - boxPad * 2;
    const qrY = bottomY - qrSize - boxPad * 2;
    parts.push(
      `<rect x="${qrX}" y="${qrY}" width="${qrSize + boxPad * 2}" height="${qrSize + boxPad * 2}" rx="${12 * u}" fill="#ffffff"/>`,
      `<image href="${qrDataUri}" x="${qrX + boxPad}" y="${qrY + boxPad}" width="${qrSize}" height="${qrSize}"/>`,
      `<text x="${qrX + boxPad + qrSize / 2}" y="${qrY - 10 * u}" font-family="${FONT}" font-size="${22 * u}" fill="${fg}" opacity="0.75" text-anchor="middle">Scanează-mă</text>`
    );
  }

  parts.push("</svg>");
  return parts.join("\n");
}
