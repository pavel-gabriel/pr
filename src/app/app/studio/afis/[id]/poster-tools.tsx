"use client";

/** Unelte client-side pentru afiș: export PNG (canvas) și printare. */
export function PosterTools({
  svgUrl,
  width,
  height,
  filename,
}: {
  svgUrl: string;
  width: number;
  height: number;
  filename: string;
}) {
  async function downloadPng() {
    const svgText = await fetch(svgUrl).then((r) => r.text());
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Nu am putut încărca afișul."));
        img.src = objectUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(pngBlob);
        a.download = `${filename}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function printPoster() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<!doctype html><html><head><title>Printează afișul</title>` +
        `<style>@page{size:A4;margin:0}html,body{margin:0;padding:0}` +
        `img{width:100%;height:auto;display:block}</style></head>` +
        `<body><img src="${svgUrl}" onload="window.print()"/></body></html>`
    );
    win.document.close();
  }

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={svgUrl}
        download={`${filename}.svg`}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:border-emerald-600 hover:text-emerald-600"
      >
        Descarcă SVG (vector)
      </a>
      <button
        onClick={downloadPng}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Descarcă PNG (social media)
      </button>
      <button
        onClick={printPoster}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:border-emerald-600 hover:text-emerald-600"
      >
        🖨 Printează
      </button>
    </div>
  );
}
