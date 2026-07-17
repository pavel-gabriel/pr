"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/types";

/** Restaurantul utilizatorului curent (primul — un restaurant per cont în MVP). */
export async function getOwnedRestaurant(): Promise<Restaurant | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return data;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ă/g, "a")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/ș|ş/g, "s")
    .replace(/ț|ţ/g, "t")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uploadImage(
  file: File,
  restaurantId: string
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Imaginea depășește 5MB.");
  }
  const supabase = await createClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${restaurantId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("menu-images")
    .upload(path, file, { contentType: file.type || "image/jpeg" });
  if (error) throw new Error(`Upload eșuat: ${error.message}`);
  const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
  return data.publicUrl;
}

// ── Restaurant ────────────────────────────────────────────────────────────

export async function createRestaurant(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/app?error=Numele+este+obligatoriu");

  const slug = slugify(String(formData.get("slug") || name));
  const { error } = await supabase.from("restaurants").insert({
    owner_id: user.id,
    name,
    slug,
    description: String(formData.get("description") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    brand_color: String(formData.get("brand_color") || "#059669"),
  });

  if (error) {
    const msg =
      error.code === "23505"
        ? "Adresa (slug-ul) este deja folosită — alege alta."
        : error.message;
    redirect(`/app?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/app");
  redirect("/app");
}

export async function updateRestaurant(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getOwnedRestaurant();
  if (!restaurant) redirect("/app");

  const logoFile = formData.get("logo") as File | null;
  let logoUrl: string | null = null;
  if (logoFile && logoFile.size > 0) {
    logoUrl = await uploadImage(logoFile, restaurant.id);
  }

  const { error } = await supabase
    .from("restaurants")
    .update({
      name: String(formData.get("name") ?? restaurant.name).trim(),
      description:
        String(formData.get("description") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      brand_color: String(formData.get("brand_color") || restaurant.brand_color),
      is_published: formData.get("is_published") === "on",
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    })
    .eq("id", restaurant.id);

  if (error) redirect(`/app?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/app");
  revalidatePath(`/m/${restaurant.slug}`);
  redirect("/app");
}

// ── Categorii ─────────────────────────────────────────────────────────────

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getOwnedRestaurant();
  if (!restaurant) redirect("/app");

  const name = String(formData.get("name") ?? "").trim();
  if (name) {
    await supabase.from("menu_categories").insert({
      restaurant_id: restaurant.id,
      name,
      sort_order: Number(formData.get("sort_order") || 0),
    });
  }
  revalidatePath("/app/meniu");
  revalidatePath(`/m/${restaurant.slug}`);
  redirect("/app/meniu");
}

export async function deleteCategory(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getOwnedRestaurant();
  if (!restaurant) redirect("/app");

  await supabase
    .from("menu_categories")
    .delete()
    .eq("id", String(formData.get("id")))
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/app/meniu");
  revalidatePath(`/m/${restaurant.slug}`);
  redirect("/app/meniu");
}

// ── Preparate ─────────────────────────────────────────────────────────────

export async function createItem(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getOwnedRestaurant();
  if (!restaurant) redirect("/app");

  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "");
  const priceLei = parseFloat(String(formData.get("price") || "0"));
  if (!name || !categoryId) redirect("/app/meniu?error=Nume+si+categorie+obligatorii");

  const imageFile = formData.get("image") as File | null;
  let imageUrl: string | null = null;
  try {
    if (imageFile && imageFile.size > 0) {
      imageUrl = await uploadImage(imageFile, restaurant.id);
    }
  } catch (e) {
    redirect(
      `/app/meniu?error=${encodeURIComponent(e instanceof Error ? e.message : "Upload eșuat")}`
    );
  }

  const { error } = await supabase.from("menu_items").insert({
    restaurant_id: restaurant.id,
    category_id: categoryId,
    name,
    name_en: String(formData.get("name_en") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    description_en:
      String(formData.get("description_en") ?? "").trim() || null,
    price_cents: Math.round((Number.isFinite(priceLei) ? priceLei : 0) * 100),
    image_url: imageUrl,
    allergens: String(formData.get("allergens") ?? "")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean),
  });

  if (error) redirect(`/app/meniu?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/app/meniu");
  revalidatePath(`/m/${restaurant.slug}`);
  redirect("/app/meniu");
}

export async function updateItem(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getOwnedRestaurant();
  if (!restaurant) redirect("/app");

  const id = String(formData.get("id"));
  const priceLei = parseFloat(String(formData.get("price") || "0"));

  const imageFile = formData.get("image") as File | null;
  let imageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    imageUrl = await uploadImage(imageFile, restaurant.id);
  }

  await supabase
    .from("menu_items")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      name_en: String(formData.get("name_en") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      description_en:
        String(formData.get("description_en") ?? "").trim() || null,
      price_cents: Math.round((Number.isFinite(priceLei) ? priceLei : 0) * 100),
      is_available: formData.get("is_available") === "on",
      allergens: String(formData.get("allergens") ?? "")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      ...(imageUrl ? { image_url: imageUrl } : {}),
    })
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/app/meniu");
  revalidatePath(`/m/${restaurant.slug}`);
  redirect("/app/meniu");
}

export async function deleteItem(formData: FormData) {
  const supabase = await createClient();
  const restaurant = await getOwnedRestaurant();
  if (!restaurant) redirect("/app");

  await supabase
    .from("menu_items")
    .delete()
    .eq("id", String(formData.get("id")))
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/app/meniu");
  revalidatePath(`/m/${restaurant.slug}`);
  redirect("/app/meniu");
}
