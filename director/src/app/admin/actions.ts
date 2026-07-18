"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect("/");
  return user;
}

export async function moderateListing(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (id && ["approved", "rejected", "pending"].includes(status)) {
    const admin = createAdminClient();
    await admin.from("listings").update({ status }).eq("id", id);
  }
  revalidatePath("/admin");
  redirect("/admin");
}

export async function toggleFeatured(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("listings")
    .select("is_featured")
    .eq("id", id)
    .maybeSingle();
  if (listing) {
    await admin
      .from("listings")
      .update({ is_featured: !listing.is_featured })
      .eq("id", id);
  }
  revalidatePath("/admin");
  redirect("/admin");
}

export async function resolveClaim(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || !["approved", "rejected"].includes(decision)) redirect("/admin");

  const admin = createAdminClient();
  const { data: claim } = await admin
    .from("listing_claims")
    .select("id, listing_id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!claim) redirect("/admin");

  await admin.from("listing_claims").update({ status: decision }).eq("id", id);

  // La aprobare, profilul trece în proprietatea utilizatorului care a cerut
  // revendicarea (dacă cererea a venit de la un cont autentificat).
  if (decision === "approved" && claim.user_id) {
    await admin
      .from("listings")
      .update({ owner_id: claim.user_id })
      .eq("id", claim.listing_id)
      .is("owner_id", null);
  }

  revalidatePath("/admin");
  redirect("/admin");
}
