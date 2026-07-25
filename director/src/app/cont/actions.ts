"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cont");
  return user;
}

async function uploadImages(files: File[], listingKey: string): Promise<string[]> {
  const admin = createAdminClient();
  const urls: string[] = [];
  for (const file of files.slice(0, 8)) {
    if (!file || file.size === 0) continue;
    if (file.size > 5 * 1024 * 1024) continue; // sărim peste fișierele >5MB
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${listingKey}/${crypto.randomUUID()}.${ext}`;
    const { error } = await admin.storage
      .from("listing-images")
      .upload(path, file, { contentType: file.type || "image/jpeg" });
    if (!error) {
      urls.push(admin.storage.from("listing-images").getPublicUrl(path).data.publicUrl);
    }
  }
  return urls;
}

function listingFieldsFrom(formData: FormData) {
  const rating = parseFloat(String(formData.get("google_rating") || ""));
  const ratingCount = parseInt(String(formData.get("google_rating_count") || ""), 10);
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    website: String(formData.get("website") ?? "").trim() || null,
    google_maps_url: String(formData.get("google_maps_url") ?? "").trim() || null,
    google_rating:
      Number.isFinite(rating) && rating >= 1 && rating <= 5
        ? Math.round(rating * 10) / 10
        : null,
    google_rating_count:
      Number.isFinite(ratingCount) && ratingCount >= 0 ? ratingCount : null,
    program: String(formData.get("program") ?? "").trim() || null,
  };
}

export async function createListing(formData: FormData) {
  const user = await requireUser();
  const fields = listingFieldsFrom(formData);
  const categoryId = String(formData.get("category_id") ?? "");
  const cityId = String(formData.get("city_id") ?? "");
  if (!fields.name || !categoryId || !cityId) {
    redirect(`/cont/adauga?error=${encodeURIComponent("Numele, categoria și orașul sunt obligatorii.")}`);
  }

  const admin = createAdminClient();
  let slug = slugify(fields.name);
  const { data: slugTaken } = await admin
    .from("listings")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (slugTaken) slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`;

  const images = await uploadImages(
    formData.getAll("images").filter((f): f is File => f instanceof File),
    slug
  );

  const { data: listing, error } = await admin
    .from("listings")
    .insert({
      owner_id: user.id,
      slug,
      category_id: categoryId,
      city_id: cityId,
      images,
      status: "pending",
      ...fields,
    })
    .select("id")
    .single();
  if (error || !listing) {
    redirect(`/cont/adauga?error=${encodeURIComponent(error?.message ?? "Eroare la salvare.")}`);
  }

  const tagIds = formData.getAll("tags").map(String).filter(Boolean);
  if (tagIds.length > 0) {
    await admin
      .from("listing_tag_map")
      .insert(tagIds.map((tag_id) => ({ listing_id: listing.id, tag_id })));
  }

  revalidatePath("/cont");
  redirect("/cont?created=1");
}

export async function updateListing(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("listings")
    .select("id, owner_id, slug, images")
    .eq("id", id)
    .maybeSingle();
  if (!listing || listing.owner_id !== user.id) redirect("/cont");

  const fields = listingFieldsFrom(formData);
  if (!fields.name) redirect(`/cont/editare/${id}?error=${encodeURIComponent("Numele este obligatoriu.")}`);

  const newImages = await uploadImages(
    formData.getAll("images").filter((f): f is File => f instanceof File),
    listing.slug
  );

  await admin
    .from("listings")
    .update({
      ...fields,
      // Pozele noi se adaugă la cele existente (max 8 în total).
      images: [...listing.images, ...newImages].slice(0, 8),
    })
    .eq("id", id);

  const tagIds = formData.getAll("tags").map(String).filter(Boolean);
  await admin.from("listing_tag_map").delete().eq("listing_id", id);
  if (tagIds.length > 0) {
    await admin
      .from("listing_tag_map")
      .insert(tagIds.map((tag_id) => ({ listing_id: id, tag_id })));
  }

  revalidatePath("/cont");
  redirect("/cont?updated=1");
}

export async function removeImage(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const imageUrl = String(formData.get("image_url") ?? "");

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("listings")
    .select("id, owner_id, images")
    .eq("id", id)
    .maybeSingle();
  if (!listing || listing.owner_id !== user.id) redirect("/cont");

  await admin
    .from("listings")
    .update({ images: listing.images.filter((img: string) => img !== imageUrl) })
    .eq("id", id);

  revalidatePath(`/cont/editare/${id}`);
  redirect(`/cont/editare/${id}`);
}

/** Checkout Stripe pentru planul Promovat (abonament lunar per listare). */
export async function startFeaturedCheckout(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_FEATURED) {
    redirect(`/cont?error=${encodeURIComponent("Plățile nu sunt configurate încă — scrie-ne și activăm manual.")}`);
  }

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("listings")
    .select("id, owner_id, name, is_featured")
    .eq("id", id)
    .maybeSingle();
  if (!listing || listing.owner_id !== user.id || listing.is_featured) {
    redirect("/cont");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email ?? undefined,
    line_items: [{ price: process.env.STRIPE_PRICE_FEATURED!, quantity: 1 }],
    subscription_data: { metadata: { listing_id: listing.id, kind: "featured" } },
    metadata: { listing_id: listing.id, kind: "featured" },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cont?featured=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cont`,
    locale: "ro",
  });

  redirect(session.url!);
}
