import Link from "next/link";

export default function Home() {
  return (
    <main>
      {/* Header */}
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            FTF<span className="text-emerald-600"> Consulting</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/preturi" className="hover:text-emerald-600">
              Prețuri
            </Link>
            <Link href="/seo" className="hover:text-emerald-600">
              Audit SEO gratuit
            </Link>
            <Link href="/login" className="hover:text-emerald-600">
              Autentificare
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
            >
              Începe gratuit
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <p className="mb-4 inline-block rounded-full bg-emerald-50 px-4 py-1 text-sm font-medium text-emerald-700">
          Pentru restaurante, cafenele și baruri
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Preparatele tale, în <span className="text-emerald-600">videoclipuri</span>{" "}
          care vând
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600">
          Încarci 1–2 poze cu un preparat, AI-ul generează un clip video de
          prezentare. Îl pui în meniul digital QR, pe Instagram, TikTok și
          Google — la o fracțiune din costul unui videograf.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700"
          >
            Creează meniul tău
          </Link>
          <Link
            href="/preturi"
            className="rounded-lg border border-neutral-300 px-6 py-3 font-medium hover:border-emerald-600 hover:text-emerald-600"
          >
            Vezi prețurile
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-100 bg-neutral-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-3 text-3xl">🎬</div>
            <h3 className="mb-2 font-semibold">Video AI pentru fiecare preparat</h3>
            <p className="text-sm text-neutral-600">
              Clipuri cinematice generate din pozele tale, descărcabile și în
              format vertical pentru Reels și TikTok.
            </p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-3 text-3xl">📱</div>
            <h3 className="mb-2 font-semibold">Meniu digital QR inclus</h3>
            <p className="text-sm text-neutral-600">
              Meniu rapid, cu poze și video, actualizabil oricând. Clienții
              scanează codul QR de pe masă — fără aplicații de instalat.
            </p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-3 text-3xl">📈</div>
            <h3 className="mb-2 font-semibold">Vizibilitate pe Google</h3>
            <p className="text-sm text-neutral-600">
              Audit SEO gratuit pentru site-ul tău și servicii de optimizare
              locală, ca să te găsească clienții din zonă.
            </p>
          </div>
        </div>
      </section>

      {/* SEO CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold">
          Ai un site? Vezi gratuit ce-l ține pe loc în Google
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-neutral-600">
          Analiza durează sub un minut și primești un raport cu scor și
          recomandări concrete — fără obligații.
        </p>
        <Link
          href="/seo"
          className="mt-6 inline-block rounded-lg border border-emerald-600 px-6 py-3 font-medium text-emerald-700 hover:bg-emerald-50"
        >
          Rulează auditul SEO gratuit
        </Link>
      </section>

      <footer className="border-t border-neutral-200 py-8 text-center text-sm text-neutral-500">
        © {new Date().getFullYear()} FTF Consulting ·{" "}
        <a href="https://ftfconsulting.ro" className="hover:text-emerald-600">
          ftfconsulting.ro
        </a>{" "}
        ·{" "}
        <Link href="/confidentialitate" className="hover:text-emerald-600">
          Confidențialitate
        </Link>
      </footer>
    </main>
  );
}
