import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ListingWithRelations } from "@/lib/types";
import { LISTING_SELECT, getViewsLast30Days } from "@/lib/queries";
import { signOut } from "../(auth)/actions";
import { startFeaturedCheckout } from "./actions";
import { redirect } from "next/navigation";

export const metadata = { title: "Contul meu" };

const STATUS_LABELS: Record<string, string> = {
  draft: "Ciornă",
  pending: "În verificare",
  approved: "Publicată",
  rejected: "Respinsă",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string; featured?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cont");

  const { data } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const listings = (data ?? []) as unknown as ListingWithRelations[];

  const viewsByListing = await getViewsLast30Days(listings.map((l) => l.id));

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Afacerile tale</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/cont/adauga"
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            + Adaugă o afacere
          </Link>
          <form action={signOut}>
            <button className="text-sm text-neutral-500 hover:text-red-600">Ieși</button>
          </form>
        </div>
      </div>

      {params.created && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          Listarea a fost trimisă — o verificăm și o publicăm în cel mult 24 de ore.
        </p>
      )}
      {params.updated && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          Modificările au fost salvate.
        </p>
      )}
      {params.featured && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          Mulțumim! Statutul „Promovat” se activează automat la confirmarea plății.
        </p>
      )}
      {params.error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {params.error}
        </p>
      )}

      {listings.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-neutral-600">
            Nu ai încă nicio afacere listată. Profilul e gratuit și durează 5
            minute.
          </p>
          <Link
            href="/cont/adauga"
            className="mt-4 inline-block rounded-lg bg-orange-600 px-6 py-2.5 font-medium text-white hover:bg-orange-700"
          >
            Adaugă prima ta afacere
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            const views = viewsByListing.get(listing.id) ?? 0;
            return (
              <div key={listing.id} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {listing.name}
                      <span
                        className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          listing.status === "approved"
                            ? "bg-emerald-50 text-emerald-700"
                            : listing.status === "rejected"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {STATUS_LABELS[listing.status]}
                      </span>
                      {listing.is_featured && (
                        <span className="ml-2 rounded-full bg-orange-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                          Promovat
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {listing.category?.icon} {listing.category?.name} ·{" "}
                      {listing.city?.name}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      👁 {views} vizite în ultimele 30 de zile
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-3 text-sm">
                      {listing.status === "approved" && (
                        <Link
                          href={`/firma/${listing.slug}`}
                          className="text-orange-700 underline"
                        >
                          Vezi profilul
                        </Link>
                      )}
                      <Link
                        href={`/cont/editare/${listing.id}`}
                        className="text-orange-700 underline"
                      >
                        Editează
                      </Link>
                    </div>
                    {listing.status === "approved" && !listing.is_featured && (
                      <form action={startFeaturedCheckout}>
                        <input type="hidden" name="id" value={listing.id} />
                        <button className="rounded-lg border border-orange-600 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50">
                          ⭐ Devino Promovat — top de categorie
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
