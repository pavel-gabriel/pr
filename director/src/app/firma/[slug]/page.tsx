import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getListingBySlug } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { GoogleRating } from "@/components/listing-card";
import { siteUrl } from "@/lib/types";
import { claimListing } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing || listing.status !== "approved") return {};
  return {
    title: `${listing.name} — ${listing.category.name} în ${listing.city.name}`,
    description:
      listing.description ??
      `${listing.name}: ${listing.category.name.toLowerCase()} în ${listing.city.name}.`,
    openGraph: listing.images[0] ? { images: [listing.images[0]] } : undefined,
  };
}

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ claimed?: string; claim_error?: string }>;
}) {
  const { slug } = await params;
  const { claimed, claim_error } = await searchParams;
  const listing = await getListingBySlug(slug);
  if (!listing || listing.status !== "approved") notFound();

  // Contorizare vizită (best-effort, agregat zilnic — argumentul de
  // conversie către planul Promovat).
  try {
    const admin = createAdminClient();
    await admin.rpc("increment_listing_view", { p_listing_id: listing.id });
  } catch {
    // statistica nu blochează pagina
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": listing.category.slug === "restaurante" ? "Restaurant" : "LocalBusiness",
    name: listing.name,
    description: listing.description ?? undefined,
    image: listing.images[0] ?? undefined,
    address: listing.address
      ? {
          "@type": "PostalAddress",
          streetAddress: listing.address,
          addressLocality: listing.city.name,
          addressCountry: "RO",
        }
      : undefined,
    telephone: listing.phone ?? undefined,
    url: `${siteUrl()}/firma/${listing.slug}`,
    ...(listing.google_rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: listing.google_rating,
            reviewCount: listing.google_rating_count ?? 1,
          },
        }
      : {}),
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-neutral-500">
        <Link href={`/${listing.city.slug}`} className="hover:text-orange-700">
          {listing.city.name}
        </Link>{" "}
        /{" "}
        <Link
          href={`/${listing.city.slug}/${listing.category.slug}`}
          className="hover:text-orange-700"
        >
          {listing.category.name}
        </Link>{" "}
        / {listing.name}
      </nav>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {listing.name}
            {listing.is_featured && (
              <span className="ml-3 align-middle rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white">
                Promovat
              </span>
            )}
          </h1>
          <p className="mt-1 text-neutral-600">
            {listing.category.icon} {listing.category.name} · {listing.city.name}
          </p>
        </div>
        <div className="text-right">
          <GoogleRating
            rating={listing.google_rating}
            count={listing.google_rating_count}
          />
          {listing.google_maps_url && (
            <a
              href={listing.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-orange-700 underline"
            >
              Vezi recenziile pe Google →
            </a>
          )}
        </div>
      </div>

      {/* Video sau galerie */}
      {listing.video_url ? (
        <video
          src={listing.video_url}
          poster={listing.images[0] ?? undefined}
          autoPlay
          loop
          muted
          playsInline
          controls
          className="mt-6 aspect-video w-full rounded-2xl object-cover"
        />
      ) : listing.images[0] ? (
        <Image
          src={listing.images[0]}
          alt={listing.name}
          width={1024}
          height={576}
          className="mt-6 aspect-video w-full rounded-2xl object-cover"
        />
      ) : null}

      {listing.images.length > 1 && (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {listing.images.slice(1, 9).map((img) => (
            <Image
              key={img}
              src={img}
              alt={listing.name}
              width={300}
              height={200}
              className="aspect-[3/2] w-full rounded-xl object-cover"
            />
          ))}
        </div>
      )}

      {/* Specialități */}
      {listing.tags.length > 0 && (
        <p className="mt-5 flex flex-wrap gap-2">
          {listing.tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/${listing.city.slug}/gust/${tag.slug}`}
              className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700 hover:bg-orange-50 hover:text-orange-700"
            >
              {tag.name}
            </Link>
          ))}
        </p>
      )}

      {listing.description && (
        <p className="mt-6 whitespace-pre-line text-neutral-700">{listing.description}</p>
      )}

      {/* Date de contact */}
      <div className="mt-8 grid gap-4 rounded-2xl bg-white p-6 shadow-sm sm:grid-cols-2">
        {listing.address && (
          <p className="text-sm">
            📍 {listing.address}, {listing.city.name}
          </p>
        )}
        {listing.phone && (
          <p className="text-sm">
            📞{" "}
            <a href={`tel:${listing.phone}`} className="text-orange-700 underline">
              {listing.phone}
            </a>
          </p>
        )}
        {listing.website && (
          <p className="text-sm">
            🌐{" "}
            <a
              href={listing.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-700 underline"
            >
              {listing.website.replace(/^https?:\/\//, "")}
            </a>
          </p>
        )}
        {listing.program && <p className="text-sm">🕐 {listing.program}</p>}
      </div>

      {/* Revendicare profil seed */}
      {!listing.owner_id && (
        <section className="mt-8 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50/50 p-6">
          {claimed ? (
            <p className="font-medium text-orange-800">
              ✅ Cererea de revendicare a fost trimisă — te contactăm pentru
              verificare în cel mult 24 de ore lucrătoare.
            </p>
          ) : (
            <>
              <h2 className="font-bold">E afacerea ta? Revendic-o gratuit</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Preiei controlul profilului: poze, descriere, program, video de
                prezentare și statistici de vizitatori.
              </p>
              {claim_error && (
                <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                  {claim_error}
                </p>
              )}
              <form action={claimListing} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="listing_id" value={listing.id} />
                <input type="hidden" name="slug" value={listing.slug} />
                <input
                  name="name"
                  required
                  placeholder="Numele tău *"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Email *"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  name="phone"
                  type="tel"
                  placeholder="Telefon"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  name="message"
                  placeholder="Funcția ta în firmă"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <button className="rounded-lg bg-orange-600 py-2.5 font-medium text-white hover:bg-orange-700 sm:col-span-2">
                  Trimite cererea de revendicare
                </button>
              </form>
            </>
          )}
        </section>
      )}
    </main>
  );
}
