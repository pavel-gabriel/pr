import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getApprovedListings,
  getCategories,
  getCityBySlug,
  getTags,
} from "@/lib/queries";
import { ListingCard } from "@/components/listing-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ oras: string }>;
}): Promise<Metadata> {
  const { oras } = await params;
  const city = await getCityBySlug(oras);
  if (!city) return {};
  return {
    title: `Afaceri locale în ${city.name} — restaurante, cafenele, servicii`,
    description: `Descoperă cele mai bune afaceri din ${city.name}: restaurante, cafenele, baruri și servicii locale, cu poze, video și rating Google.`,
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ oras: string }>;
}) {
  const { oras } = await params;
  const city = await getCityBySlug(oras);
  if (!city || !city.is_active) notFound();

  const [categories, tags, listings] = await Promise.all([
    getCategories(),
    getTags(),
    getApprovedListings({ cityId: city.id, limit: 12 }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">
        Descoperă <span className="text-orange-600">{city.name}</span>
      </h1>
      <p className="mt-2 text-neutral-600">
        Afacerile locale, pe categorii și pofte — cu poze, video și rating Google.
      </p>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Categorii</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/${city.slug}/${cat.slug}`}
              className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm hover:border-orange-200 hover:shadow"
            >
              <span className="text-2xl">{cat.icon}</span>
              <p className="mt-1 font-medium">{cat.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Pofte & specialități</h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/${city.slug}/gust/${tag.slug}`}
              className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm hover:border-orange-600 hover:text-orange-700"
            >
              {tag.kind === "bautura" ? "🥂" : "🍜"} {tag.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Cele mai noi în {city.name}</h2>
        {listings.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-neutral-600 shadow-sm">
            Încă adăugăm afaceri din {city.name}.{" "}
            <Link href="/cont/adauga" className="text-orange-700 underline">
              Fii printre primele listate — gratuit
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
