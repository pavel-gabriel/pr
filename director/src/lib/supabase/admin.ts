import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client cu service role — DOAR pe server (webhooks, joburi de fundal).
 * Ocolește RLS; nu importa niciodată în cod client-side.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
