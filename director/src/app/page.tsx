import Link from "next/link";
import { getApprovedListings, getCategories, getCities, getTags } from "@/lib/queries";
import { ListingCard } from "@/components/listing-card";
import { SITE_NAME } from "@/lib/types";

export const revalidate = 300;

export default async function HomePage() {
  const [cities, categories, tags] = await Promise.all([
    getCities(),
    getCategories(),
    getTags(),
  ]);
  const activeCities = cities.filter((c) => c.is_active);
  const mainCity = activeCities[0];
  const featured = mainCity
    ? (await getApprovedListings({ cityId: mainCity.id, limit: 6 })).filter(
        (l) => l.images.length > 0 || l.is_featured
      )
    : [];

  return (
    <main>
      {/* Hero */}
      <section className="bg-white px-4 py-16 text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight">
          Afacerile bune din <span className="text-orange-600">orașul tău</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">
          Restaurante, cafenele, servicii — cu poze, video și rating Google.
          Locul unde afacerile locale își pun afișul.
        </p>
        {mainCity && (
          <Link
            href={`/${mainCity.slug}`}
            className="mt-6 inline-block rounded-lg bg-orange-600 px-6 py-3 font-medium text-white hover:bg-orange-700"
          >
            Descoperă {mainCity.name} →
          </Link>
        )}
      </section>

      {/* Specialități — „unde mănânci / ce bei” */}
      {mainCity && tags.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="mb-4 text-xl font-bold">
            Pofte? Găsește exact ce cauți în {mainCity.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/${mainCity.slug}/gust/${tag.slug}`}
                className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm hover:border-orange-600 hover:text-orange-700"
              >
                {tag.kind === "bautura" ? "🥂" : "🍜"} {tag.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Categorii */}
      {mainCity && (
        <section className="mx-auto max-w-6xl px-4 py-6">
          <h2 className="mb-4 text-xl font-bold">Pe categorii</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/${mainCity.slug}/${cat.slug}`}
                className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm hover:border-orange-200 hover:shadow"
              >
                <span className="text-2xl">{cat.icon}</span>
                <p className="mt-1 font-medium">{cat.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recomandate */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="mb-4 text-xl font-bold">Recomandate în {mainCity!.name}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* Orașe */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="mb-4 text-xl font-bold">Orașe</h2>
        <div className="flex flex-wrap gap-2">
          {cities.map((city) =>
            city.is_active ? (
              <Link
                key={city.id}
                href={`/${city.slug}`}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm hover:text-orange-700"
              >
                {city.name}
              </Link>
            ) : (
              <span
                key={city.id}
                className="rounded-full bg-neutral-100 px-4 py-2 text-sm text-neutral-400"
                title="În curând"
              >
                {city.name} · în curând
              </span>
            )
          )}
        </div>
      </section>

      {/* CTA firme */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl bg-orange-600 px-6 py-10 text-center text-white">
          <h2 className="text-2xl font-bold">Ai o afacere locală?</h2>
          <p className="mx-auto mt-2 max-w-lg text-orange-50">
            Listează-te gratuit pe {SITE_NAME}: profil cu poze, video de
            prezentare și link către recenziile tale Google. Fii găsit de
            clienții din orașul tău.
          </p>
          <Link
            href="/cont/adauga"
            className="mt-5 inline-block rounded-lg bg-white px-6 py-3 font-medium text-orange-700 hover:bg-orange-50"
          >
            Adaugă-ți afacerea gratuit
          </Link>
        </div>
      </section>
    </main>
  );
}
