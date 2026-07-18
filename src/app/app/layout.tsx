import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/app" className="font-bold">
            FTF<span className="text-emerald-600"> Consulting</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/app" className="hover:text-emerald-600">
              Panou
            </Link>
            <Link href="/app/meniu" className="hover:text-emerald-600">
              Meniu
            </Link>
            <Link href="/app/video" className="hover:text-emerald-600">
              Video AI
            </Link>
            <Link href="/app/abonament" className="hover:text-emerald-600">
              Abonament
            </Link>
            {profile?.is_admin && (
              <Link href="/app/admin" className="font-medium text-emerald-700 hover:text-emerald-600">
                Lead-uri
              </Link>
            )}
            <form action={signOut}>
              <button className="text-neutral-500 hover:text-red-600">Ieși</button>
            </form>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
