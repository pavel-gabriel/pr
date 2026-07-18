import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Callback pentru confirmarea emailului (schimbă codul pe sesiune). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/cont";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/cont"}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Link invalid sau expirat.")}`
  );
}
