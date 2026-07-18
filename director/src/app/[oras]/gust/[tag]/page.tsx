import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getApprovedListings, getCityBySlug } from "@/lib/queries";
import { ListingCard } from "@/components/listing-card";
import type { ListingTag } from "@/lib/types";

async function getTagBySlug(slug: string): Promise<ListingTag | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listing_tags")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data as ListingTag | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ oras: string; tag: string }>;
}): Promise<Metadata> {
  const { oras, tag } = await params;
  const [city, tagRow] = await Promise.all([getCityBySlug(oras), getTagBySlug(tag)]);
  if (!city || !tagRow) return {};
  const verb = tagRow.kind === "bautura" ? "Unde bei" : "Unde mănânci";
  return {
    title: `${verb} ${tagRow.name.toLowerCase()} în ${city.name}`,
    description: `Locurile din ${city.name} unde găsești ${tagRow.name.toLowerCase()} — cu poze, video și rating Google.`,
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ oras: string; tag: string }>;
}) {
  const { oras, tag } = await params;
  const [city, tagRow] = await Promise.all([getCityBySlug(oras), getTagBySlug(tag)]);
  if (!city || !city.is_active || !tagRow) notFound();

  const listings = await getApprovedListings({ cityId: city.id, tagSlug: tagRow.slug });
  const verb = tagRow.kind === "bautura" ? "Unde bei" : "Unde mănânci";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <nav className="text-sm text-neutral-500">
        <Link href={`/${city.slug}`} className="hover:text-orange-700">
          {city.name}
        </Link>{" "}
        / {tagRow.name}
      </nav>
      <h1 className="mt-2 text-3xl font-bold">
        {verb} <span className="text-orange-600">{tagRow.name.toLowerCase()}</span> în{" "}
        {city.name}
      </h1>

      {listings.length === 0 ? (
        <p className="mt-8 rounded-xl bg-white p-6 text-neutral-600 shadow-sm">
          Încă n-am găsit locuri cu {tagRow.name.toLowerCase()} în {city.name}.
          Ai o recomandare sau e localul tău?{" "}
          <Link href="/cont/adauga" className="text-orange-700 underline">
            Adaugă-l gratuit
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
