import Image from "next/image";
import Link from "next/link";
import type { ListingWithRelations } from "@/lib/types";

export function GoogleRating({
  rating,
  count,
}: {
  rating: number | null;
  count: number | null;
}) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-amber-500">★</span>
      <span className="font-semibold">{rating.toFixed(1)}</span>
      {count ? <span className="text-neutral-400">({count} recenzii Google)</span> : null}
    </span>
  );
}

export function ListingCard({ listing }: { listing: ListingWithRelations }) {
  return (
    <Link
      href={`/firma/${listing.slug}`}
      className="group overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[16/10] bg-neutral-100">
        {listing.images[0] ? (
          <Image
            src={listing.images[0]}
            alt={listing.name}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">
            {listing.category?.icon ?? "🏪"}
          </div>
        )}
        {listing.is_featured && (
          <span className="absolute left-3 top-3 rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white">
            Promovat
          </span>
        )}
        {listing.video_url && (
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            🎬 video
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold group-hover:text-orange-700">{listing.name}</h3>
          <GoogleRating
            rating={listing.google_rating}
            count={listing.google_rating_count}
          />
        </div>
        <p className="mt-0.5 text-sm text-neutral-500">
          {listing.category?.icon} {listing.category?.name}
          {listing.address ? ` · ${listing.address}` : ""}
        </p>
        {listing.tags?.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-1.5">
            {listing.tags.slice(0, 4).map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600"
              >
                {tag.name}
              </span>
            ))}
          </p>
        )}
      </div>
    </Link>
  );
}
