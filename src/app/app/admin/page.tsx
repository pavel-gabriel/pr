import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateRequestStatus } from "./actions";

export const metadata = { title: "Lead-uri servicii" };

const STATUS_OPTIONS = [
  ["new", "Nou"],
  ["contacted", "Contactat"],
  ["offer_sent", "Ofertă trimisă"],
  ["won", "Câștigat"],
  ["lost", "Pierdut"],
] as const;

interface RequestRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
  audit: { id: string; url: string; score: number | null } | null;
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
  const [{ data: requests }, { data: audits }] = await Promise.all([
    admin
      .from("service_requests")
      .select("*, audit:seo_audits(id, url, score)")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("seo_audits")
      .select("id, url, email, score, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const rows = (requests ?? []) as unknown as RequestRow[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Lead-uri servicii SEO</h1>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">
          Cereri de ofertă ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-neutral-600 shadow-sm">
            Nicio cerere încă — promovează pagina{" "}
            <Link href="/seo" className="text-emerald-700 underline">
              /seo
            </Link>{" "}
            ca să aduci lead-uri.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((req) => (
              <div key={req.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {req.name} ·{" "}
                      <a href={`mailto:${req.email}`} className="text-emerald-700 underline">
                        {req.email}
                      </a>
                      {req.phone && (
                        <>
                          {" · "}
                          <a href={`tel:${req.phone}`} className="text-emerald-700 underline">
                            {req.phone}
                          </a>
                        </>
                      )}
                    </p>
                    {req.audit && (
                      <p className="text-sm text-neutral-600">
                        Site: {req.audit.url} — scor {req.audit.score ?? "?"}/100 ·{" "}
                        <Link
                          href={`/seo/raport/${req.audit.id}`}
                          className="text-emerald-700 underline"
                        >
                          vezi raportul
                        </Link>
                      </p>
                    )}
                    {req.message && (
                      <p className="mt-1 text-sm text-neutral-500">„{req.message}”</p>
                    )}
                    <p className="mt-1 text-xs text-neutral-400">
                      {new Date(req.created_at).toLocaleString("ro-RO")}
                    </p>
                  </div>
                  <form action={updateRequestStatus} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={req.id} />
                    <select
                      name="status"
                      defaultValue={req.status}
                      className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                    >
                      {STATUS_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700">
                      Salvează
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Audituri recente</h2>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 font-medium">Site</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Scor</th>
              </tr>
            </thead>
            <tbody>
              {(audits ?? []).map((audit) => (
                <tr key={audit.id} className="border-t border-neutral-100">
                  <td className="px-4 py-2 text-neutral-600">
                    {new Date(audit.created_at).toLocaleDateString("ro-RO")}
                  </td>
                  <td className="max-w-xs truncate px-4 py-2">{audit.url}</td>
                  <td className="px-4 py-2">{audit.email}</td>
                  <td className="px-4 py-2">
                    {audit.status === "done" ? (
                      <Link
                        href={`/seo/raport/${audit.id}`}
                        className="text-emerald-700 underline"
                      >
                        {audit.score}/100
                      </Link>
                    ) : (
                      audit.status
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-neutral-400">
          Devii admin rulând în Supabase SQL Editor:{" "}
          <code>update profiles set is_admin = true where email = &apos;emailul-tău&apos;;</code>
        </p>
      </section>
    </div>
  );
}
