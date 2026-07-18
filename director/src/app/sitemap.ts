import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/types";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const admin = createAdminClient();

  const [{ data: cities }, { data: categories }, { data: tags }, { data: listings }] =
    await Promise.all([
      admin.from("cities").select("slug").eq("is_active", true),
      admin.from("listing_categories").select("slug"),
      admin.from("listing_tags").select("slug"),
      admin.from("listings").select("slug, created_at").eq("status", "approved"),
    ]);

  const entries: MetadataRoute.Sitemap = [{ url: base, changeFrequency: "daily" }];

  for (const city of cities ?? []) {
    entries.push({ url: `${base}/${city.slug}`, changeFrequency: "daily" });
    for (const cat of categories ?? []) {
      entries.push({
        url: `${base}/${city.slug}/${cat.slug}`,
        changeFrequency: "daily",
      });
    }
    for (const tag of tags ?? []) {
      entries.push({
        url: `${base}/${city.slug}/gust/${tag.slug}`,
        changeFrequency: "weekly",
      });
    }
  }

  for (const listing of listings ?? []) {
    entries.push({
      url: `${base}/firma/${listing.slug}`,
      lastModified: listing.created_at,
      changeFrequency: "weekly",
    });
  }

  return entries;
}
