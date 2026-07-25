import { createClient } from "@/lib/supabase/server";
import type {
  City,
  ListingCategory,
  ListingTag,
  ListingWithRelations,
} from "@/lib/types";

/** Selectul standard cu relațiile listării (categorie, oraș, specialități). */
export const LISTING_SELECT =
  "*, category:listing_categories(*), city:cities(*), tags:listing_tags(*)";

export async function getCities(): Promise<City[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("cities").select("*").order("name");
  return (data ?? []) as City[];
}

export async function getCityBySlug(slug: string): Promise<City | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cities")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data as City | null;
}

export async function getCategories(): Promise<ListingCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listing_categories")
    .select("*")
    .order("sort_order");
  return (data ?? []) as ListingCategory[];
}

export async function getTags(): Promise<ListingTag[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("listing_tags").select("*").order("name");
  return (data ?? []) as ListingTag[];
}

/** Listările aprobate dintr-un oraș, featured întâi, apoi după rating. */
export async function getApprovedListings(opts: {
  cityId: string;
  categoryId?: string;
  tagSlug?: string;
  limit?: number;
}): Promise<ListingWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "approved")
    .eq("city_id", opts.cityId);
  if (opts.categoryId) query = query.eq("category_id", opts.categoryId);
  // Filtrarea pe specialitate: prin join-ul embedded (inner) pe slug.
  if (opts.tagSlug) {
    query = supabase
      .from("listings")
      .select(
        "*, category:listing_categories(*), city:cities(*), tags:listing_tags!inner(*)"
      )
      .eq("status", "approved")
      .eq("city_id", opts.cityId)
      .eq("tags.slug", opts.tagSlug);
  }
  const { data } = await query
    .order("is_featured", { ascending: false })
    .order("google_rating", { ascending: false, nullsFirst: false })
    .limit(opts.limit ?? 60);
  return (data ?? []) as unknown as ListingWithRelations[];
}

/** Vizitele din ultimele 30 de zile per listare (prin service role). */
export async function getViewsLast30Days(
  listingIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (listingIds.length === 0) return result;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data } = await admin
    .from("listing_views")
    .select("listing_id, views")
    .in("listing_id", listingIds)
    .gte("day", monthAgo);
  for (const row of data ?? []) {
    result.set(row.listing_id, (result.get(row.listing_id) ?? 0) + row.views);
  }
  return result;
}

export async function getListingBySlug(
  slug: string
): Promise<ListingWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  return data as unknown as ListingWithRelations | null;
}
