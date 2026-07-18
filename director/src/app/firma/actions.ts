"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Cerere de revendicare a unui profil seed (nerevendicat). */
export async function claimListing(formData: FormData) {
  const listingId = String(formData.get("listing_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(
      `/firma/${slug}?claim_error=${encodeURIComponent("Numele și un email valid sunt obligatorii.")}`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("listings")
    .select("id, owner_id")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.owner_id) {
    redirect(`/firma/${slug}`);
  }

  // Evităm dublurile: o singură cerere nouă per email per listare.
  const { data: existing } = await admin
    .from("listing_claims")
    .select("id")
    .eq("listing_id", listingId)
    .eq("email", email.toLowerCase())
    .eq("status", "new")
    .maybeSingle();
  if (!existing) {
    await admin.from("listing_claims").insert({
      listing_id: listingId,
      user_id: user?.id ?? null,
      name,
      email: email.toLowerCase(),
      phone: phone || null,
      message: message || null,
    });
  }

  redirect(`/firma/${slug}?claimed=1`);
}
