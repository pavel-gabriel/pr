import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { moderateListing, resolveClaim, toggleFeatured } from "./actions";

export const metadata = { title: "Administrare director" };

interface AdminListing {
  id: string;
  name: string;
  slug: string;
  status: string;
  is_featured: boolean;
  owner_id: string | null;
  created_at: string;
  category: { name: string; icon: string } | null;
  city: { name: string } | null;
}

interface AdminClaim {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  user_id: string | null;
  created_at: string;
  listing: { name: string; slug: string } | null;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) notFound();

  const admin = createAdminClient();
  const [{ data: pending }, { data: claims }, { data: recent }] = await Promise.all([
    admin
      .from("listings")
      .select("id, name, slug, status, is_featured, owner_id, created_at, category:listing_categories(name, icon), city:cities(name)")
      .eq("status", "pending")
      .order("created_at"),
    admin
      .from("listing_claims")
      .select("id, name, email, phone, message, user_id, created_at, listing:listings(name, slug)")
      .eq("status", "new")
      .order("created_at"),
    admin
      .from("listings")
      .select("id, name, slug, status, is_featured, owner_id, created_at, category:listing_categories(name, icon), city:cities(name)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const pendingListings = (pending ?? []) as unknown as AdminListing[];
  const newClaims = (claims ?? []) as unknown as AdminClaim[];
  const recentListings = (recent ?? []) as unknown as AdminListing[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold">Administrare director</h1>

      {/* Listări în așteptare */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">
          De aprobat ({pendingListings.length})
        </h2>
        {pendingListings.length === 0 ? (
          <p className="rounded-xl bg-white p-5 text-sm text-neutral-500 shadow-sm">
            Nimic în așteptare. 🎉
          </p>
        ) : (
          <div className="space-y-3">
            {pendingListings.map((listing) => (
              <div
                key={listing.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium">{listing.name}</p>
                  <p className="text-sm text-neutral-500">
                    {listing.category?.icon} {listing.category?.name} ·{" "}
                    {listing.city?.name} ·{" "}
                    {new Date(listing.created_at).toLocaleDateString("ro-RO")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={moderateListing}>
                    <input type="hidden" name="id" value={listing.id} />
                    <input type="hidden" name="status" value="approved" />
                    <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                      Aprobă
                    </button>
                  </form>
                  <form action={moderateListing}>
                    <input type="hidden" name="id" value={listing.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <button className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                      Respinge
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Revendicări */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">
          Cereri de revendicare ({newClaims.length})
        </h2>
        {newClaims.length === 0 ? (
          <p className="rounded-xl bg-white p-5 text-sm text-neutral-500 shadow-sm">
            Nicio cerere nouă.
          </p>
        ) : (
          <div className="space-y-3">
            {newClaims.map((claim) => (
              <div key={claim.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {claim.listing?.name}{" "}
                      {claim.listing && (
                        <Link
                          href={`/firma/${claim.listing.slug}`}
                          className="text-sm font-normal text-orange-700 underline"
                        >
                          vezi profilul
                        </Link>
                      )}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {claim.name} ·{" "}
                      <a href={`mailto:${claim.email}`} className="underline">
                        {claim.email}
                      </a>
                      {claim.phone && ` · ${claim.phone}`}
                      {!claim.user_id && (
                        <span className="ml-2 text-amber-600">
                          (fără cont — verifică manual înainte de aprobare)
                        </span>
                      )}
                    </p>
                    {claim.message && (
                      <p className="text-sm text-neutral-500">„{claim.message}”</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <form action={resolveClaim}>
                      <input type="hidden" name="id" value={claim.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                        Aprobă
                      </button>
                    </form>
                    <form action={resolveClaim}>
                      <input type="hidden" name="id" value={claim.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <button className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                        Respinge
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Listări publicate — featured manual */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Publicate recent</h2>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Afacere</th>
                <th className="px-4 py-2 font-medium">Oraș</th>
                <th className="px-4 py-2 font-medium">Revendicat</th>
                <th className="px-4 py-2 font-medium">Promovat</th>
              </tr>
            </thead>
            <tbody>
              {recentListings.map((listing) => (
                <tr key={listing.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2">
                    <Link href={`/firma/${listing.slug}`} className="hover:text-orange-700">
                      {listing.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-600">{listing.city?.name}</td>
                  <td className="px-4 py-2">{listing.owner_id ? "✅" : "—"}</td>
                  <td className="px-4 py-2">
                    <form action={toggleFeatured}>
                      <input type="hidden" name="id" value={listing.id} />
                      <button
                        className={
                          listing.is_featured
                            ? "rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white"
                            : "rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-500 hover:border-orange-600 hover:text-orange-700"
                        }
                      >
                        {listing.is_featured ? "⭐ Promovat — oprește" : "Activează manual"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
