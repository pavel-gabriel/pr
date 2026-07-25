import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getApprovedListings, getCityBySlug } from "@/lib/queries";
import { ListingCard } from "@/components/listing-card";
import type { ListingCategory } from "@/lib/types";

async function getCategoryBySlug(slug: string): Promise<ListingCategory | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listing_categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data as ListingCategory | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ oras: string; categorie: string }>;
}): Promise<Metadata> {
  const { oras, categorie } = await params;
  const [city, category] = await Promise.all([
    getCityBySlug(oras),
    getCategoryBySlug(categorie),
  ]);
  if (!city || !category) return {};
  return {
    title: `${category.name} în ${city.name}`,
    description: `${category.name} din ${city.name} — recomandări cu poze, video și rating Google. Găsește localul sau serviciul potrivit.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ oras: string; categorie: string }>;
}) {
  const { oras, categorie } = await params;
  const [city, category] = await Promise.all([
    getCityBySlug(oras),
    getCategoryBySlug(categorie),
  ]);
  if (!city || !city.is_active || !category) notFound();

  const listings = await getApprovedListings({
    cityId: city.id,
    categoryId: category.id,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <nav className="text-sm text-neutral-500">
        <Link href={`/${city.slug}`} className="hover:text-orange-700">
          {city.name}
        </Link>{" "}
        / {category.name}
      </nav>
      <h1 className="mt-2 text-3xl font-bold">
        {category.icon} {category.name} în{" "}
        <span className="text-orange-600">{city.name}</span>
      </h1>

      {listings.length === 0 ? (
        <p className="mt-8 rounded-xl bg-white p-6 text-neutral-600 shadow-sm">
          Încă nu avem {category.name.toLowerCase()} listate în {city.name}.{" "}
          <Link href="/cont/adauga" className="text-orange-700 underline">
            Adaugă prima afacere — gratuit
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </main>
  );
}
