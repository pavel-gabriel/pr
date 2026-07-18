export interface City {
  id: string;
  name: string;
  slug: string;
  county: string | null;
  is_active: boolean;
}

export interface ListingCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
}

export type TagKind = "mancare" | "bautura" | "altele";

export interface ListingTag {
  id: string;
  name: string;
  slug: string;
  kind: TagKind;
}

export type ListingStatus = "draft" | "pending" | "approved" | "rejected";

export interface Listing {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  category_id: string;
  city_id: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  google_maps_url: string | null;
  google_rating: number | null;
  google_rating_count: number | null;
  images: string[];
  video_url: string | null;
  program: string | null;
  status: ListingStatus;
  is_featured: boolean;
  featured_until: string | null;
  created_at: string;
}

/** Listare cu relațiile aduse prin join (select cu alias-uri). */
export interface ListingWithRelations extends Listing {
  category: ListingCategory;
  city: City;
  tags: ListingTag[];
}

/** Numele public al directorului — configurabil când se alege brandul/domeniul. */
export const SITE_NAME =
  process.env.NEXT_PUBLIC_DIRECTOR_NAME || "Descoperă Local";

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ă|â/g, "a")
    .replace(/î/g, "i")
    .replace(/ș|ş/g, "s")
    .replace(/ț|ţ/g, "t")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
