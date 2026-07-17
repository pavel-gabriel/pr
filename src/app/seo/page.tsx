import Link from "next/link";
import { createAudit } from "./actions";

export const metadata = {
  title: "Audit SEO gratuit",
  description:
    "Analizăm gratuit site-ul tău: scor SEO, probleme găsite și recomandări concrete. Rezultatul în sub un minut.",
};

export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            FTF<span className="text-emerald-600"> Consulting</span>
          </Link>
          <Link href="/" className="text-sm hover:text-emerald-600">
            ← Înapoi la site
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-3xl font-bold">
          Audit SEO <span className="text-emerald-600">gratuit</span>
        </h1>
        <p className="mt-3 text-neutral-600">
          Introdu adresa site-ului tău și primești pe loc un raport cu scor,
          problemele care te țin pe loc în Google și recomandări concrete de
          rezolvare. Fără obligații.
        </p>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form
          action={createAudit}
          className="mt-8 space-y-4 rounded-xl bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="url" className="mb-1 block text-sm font-medium">
              Adresa site-ului
            </label>
            <input
              id="url"
              name="url"
              required
              placeholder="restaurantul-meu.ro"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Emailul tău (primești link-ul raportului)
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="nume@firma.ro"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <button className="w-full rounded-lg bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-700">
            Analizează site-ul →
          </button>
          <p className="text-center text-xs text-neutral-400">
            Analiza durează 20–60 de secunde. Nu trimitem spam.
          </p>
        </form>

        <div className="mt-10 grid gap-4 text-sm text-neutral-600 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            ✅ 15+ verificări tehnice și de conținut
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            📱 Scoruri Google Lighthouse pe mobil
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            🛠️ Recomandări concrete, pe limba ta
          </div>
        </div>
      </section>
    </main>
  );
}
