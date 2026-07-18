import Link from "next/link";
import { register } from "../actions";

export const metadata = { title: "Înregistrare" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-bold">Creează-ți contul</h1>
        <p className="mb-6 text-sm text-neutral-600">
          Gratuit — îți listezi afacerea în câteva minute.
        </p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <form action={register} className="space-y-4">
          <div>
            <label htmlFor="full_name" className="mb-1 block text-sm font-medium">
              Nume complet
            </label>
            <input
              id="full_name"
              name="full_name"
              required
              autoComplete="name"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-orange-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-orange-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Parolă (minim 8 caractere)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-orange-600 focus:outline-none"
            />
          </div>
          <button className="w-full rounded-lg bg-orange-600 py-2 font-medium text-white hover:bg-orange-700">
            Creează contul
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-600">
          Ai deja cont?{" "}
          <Link href="/login" className="text-orange-700 hover:underline">
            Autentifică-te
          </Link>
        </p>
      </div>
    </main>
  );
}
