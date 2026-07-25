import Link from "next/link";
import { PLANS } from "@/lib/plans";

export const metadata = {
  title: "Prețuri",
  description:
    "Meniu digital QR cu clipuri video AI pentru restaurantul tău — planuri de la 149 lei/lună, 14 zile gratuit.",
};

const SETUP_FEE_RON = 300;

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            FTF<span className="text-emerald-600"> Consulting</span>
          </Link>
          <Link href="/register" className="text-sm hover:text-emerald-600">
            Începe gratuit →
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold">Prețuri simple, fără surprize</h1>
        <p className="mx-auto mt-3 max-w-xl text-neutral-600">
          14 zile gratuit, fără card. Apoi alegi planul potrivit — anulezi
          oricând. Taxa unică de configurare ({SETUP_FEE_RON} lei) acoperă
          digitalizarea meniului tău de către noi.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {(["start", "pro"] as const).map((planKey) => {
            const plan = PLANS[planKey];
            const highlighted = planKey === "pro";
            return (
              <div
                key={planKey}
                className={`rounded-2xl bg-white p-8 text-left shadow-sm ${
                  highlighted ? "border-2 border-emerald-600" : "border border-neutral-200"
                }`}
              >
                {highlighted && (
                  <p className="mb-2 inline-block rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-medium text-emerald-700">
                    Recomandat
                  </p>
                )}
                <h2 className="text-xl font-bold">{plan.name}</h2>
                <p className="mt-2">
                  <span className="text-4xl font-bold">{plan.monthlyPriceRon}</span>
                  <span className="text-neutral-500"> lei/lună</span>
                </p>
                <p className="mt-3 text-sm text-neutral-600">{plan.description}</p>
                <ul className="mt-5 space-y-2 text-sm">
                  <li>✅ Meniu digital QR nelimitat</li>
                  <li>✅ {plan.videosPerMonth} clipuri video AI / lună</li>
                  <li>✅ Poze + traduceri EN per preparat</li>
                  {planKey === "pro" && <li>✅ Export vertical 9:16 pentru social media</li>}
                  {planKey === "pro" && <li>✅ Suport prioritar</li>}
                </ul>
                <Link
                  href="/register"
                  className={`mt-6 block rounded-lg py-2.5 text-center font-medium ${
                    highlighted
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border border-neutral-300 hover:border-emerald-600 hover:text-emerald-600"
                  }`}
                >
                  Începe cu 14 zile gratuit
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-sm text-neutral-500">
          Ai nevoie și de SEO sau publicitate online?{" "}
          <Link href="/seo" className="text-emerald-700 underline">
            Începe cu un audit gratuit
          </Link>{" "}
          și îți facem o ofertă personalizată.
        </p>
      </section>
    </main>
  );
}
