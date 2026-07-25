import Link from "next/link";

export const metadata = {
  title: "Politica de confidențialitate",
  description: "Cum prelucrăm datele personale la FTF Consulting.",
};

export default function PrivacyPage() {
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

      <article className="prose mx-auto max-w-2xl px-4 py-12 text-sm leading-6 text-neutral-700">
        <h1 className="mb-6 text-2xl font-bold text-neutral-900">
          Politica de confidențialitate
        </h1>

        <h2 className="mb-2 mt-6 font-bold text-neutral-900">Cine suntem</h2>
        <p>
          FTF Consulting (ftfconsulting.ro) — operator de date pentru platforma
          de meniuri digitale și servicii de marketing online. Ne poți contacta
          la contact@ftfconsulting.ro.
        </p>

        <h2 className="mb-2 mt-6 font-bold text-neutral-900">
          Ce date colectăm și de ce
        </h2>
        <ul className="list-disc pl-5">
          <li>
            <strong>Audit SEO:</strong> adresa site-ului și emailul tău — ca să
            generăm raportul, să ți-l trimitem și, dacă ceri o ofertă, să te
            contactăm. Temei: consimțământul tău (bifat la trimitere).
          </li>
          <li>
            <strong>Cont de client:</strong> nume, email, datele restaurantului
            și conținutul meniului — pentru furnizarea serviciului. Temei:
            executarea contractului.
          </li>
          <li>
            <strong>Plăți:</strong> sunt procesate de Stripe; nu stocăm datele
            cardului.
          </li>
        </ul>

        <h2 className="mb-2 mt-6 font-bold text-neutral-900">
          Cât timp păstrăm datele
        </h2>
        <p>
          Rapoartele de audit și cererile de ofertă — maximum 2 ani. Datele de
          cont — pe durata contractului plus obligațiile legale de arhivare.
        </p>

        <h2 className="mb-2 mt-6 font-bold text-neutral-900">
          Cui transmitem date
        </h2>
        <p>
          Furnizori de infrastructură strict necesari funcționării: Supabase
          (găzduire date), Stripe (plăți), Resend (emailuri), fal.ai (generare
          video din pozele încărcate de tine). Nu vindem date către terți.
        </p>

        <h2 className="mb-2 mt-6 font-bold text-neutral-900">Drepturile tale</h2>
        <p>
          Ai dreptul de acces, rectificare, ștergere, restricționare, portare și
          opoziție, precum și dreptul de a depune plângere la ANSPDCP
          (dataprotection.ro). Scrie-ne la contact@ftfconsulting.ro și
          răspundem în maximum 30 de zile.
        </p>
      </article>
    </main>
  );
}
