import { getCategories, getCities, getTags } from "@/lib/queries";
import { ListingFormFields } from "@/components/listing-form";
import { createListing } from "../actions";

export const metadata = { title: "Adaugă-ți afacerea" };

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [categories, cities, tags] = await Promise.all([
    getCategories(),
    getCities(),
    getTags(),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Adaugă-ți afacerea</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Listarea de bază e gratuită. După trimitere o verificăm (max 24h) și o
        publicăm.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        action={createListing}
        className="mt-6 grid gap-4 rounded-xl bg-white p-6 shadow-sm sm:grid-cols-2"
      >
        <ListingFormFields categories={categories} cities={cities} tags={tags} />
        <button className="rounded-lg bg-orange-600 py-2.5 font-medium text-white hover:bg-orange-700 sm:col-span-2">
          Trimite spre publicare
        </button>
      </form>
    </main>
  );
}
