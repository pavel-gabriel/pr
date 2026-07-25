"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_STATUSES = ["new", "contacted", "offer_sent", "won", "lost"];

export async function updateRequestStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect("/app");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (id && VALID_STATUSES.includes(status)) {
    const admin = createAdminClient();
    await admin.from("service_requests").update({ status }).eq("id", id);
  }

  revalidatePath("/app/admin");
  redirect("/app/admin");
}
