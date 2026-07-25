import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import { createRestaurant, getOwnedRestaurant, updateRestaurant } from "./actions";

export const metadata = { title: "Panou de control" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const restaurant = await getOwnedRestaurant();

  if (!restaurant) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="mb-2 text-2xl font-bold">Bine ai venit! 👋</h1>
        <p className="mb-6 text-neutral-600">
          Hai să-ți creăm restaurantul — durează un minut, apoi adaugi
          preparatele.
        </p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <form
          action={createRestaurant}
          className="space-y-4 rounded-xl bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Numele restaurantului *
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="Ex: Trattoria Bella"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="slug" className="mb-1 block text-sm font-medium">
              Adresa meniului (opțional)
            </label>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-neutral-500">/m/</span>
              <input
                id="slug"
                name="slug"
                placeholder="trattoria-bella"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="address" className="mb-1 block text-sm font-medium">
              Adresă
            </label>
            <input
              id="address"
              name="address"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium">
              Telefon
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="brand_color" className="mb-1 block text-sm font-medium">
              Culoarea brandului
            </label>
            <input id="brand_color" name="brand_color" type="color" defaultValue="#059669" />
          </div>
          <button className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-700">
            Creează restaurantul
          </button>
        </form>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ count: itemCount }, { count: videoCount }] = await Promise.all([
    supabase
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id),
    supabase
      .from("video_jobs")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id)
      .eq("status", "done"),
  ]);

  const plan = PLANS[restaurant.plan];
  const menuUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/m/${restaurant.slug}`;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          <p className="text-sm text-neutral-600">
            Plan: <span className="font-medium">{plan.name}</span> ·{" "}
            {restaurant.is_published ? "Meniu publicat" : "Meniu nepublicat"}
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href={menuUrl}
            target="_blank"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:border-emerald-600 hover:text-emerald-600"
          >
            Vezi meniul public ↗
          </a>
          <a
            href={`/api/qr/${restaurant.slug}`}
            download={`qr-${restaurant.slug}.png`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Descarcă QR
          </a>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-neutral-500">Preparate în meniu</p>
          <p className="text-3xl font-bold">{itemCount ?? 0}</p>
          <Link href="/app/meniu" className="text-sm text-emerald-700 hover:underline">
            Gestionează meniul →
          </Link>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-neutral-500">Clipuri video generate</p>
          <p className="text-3xl font-bold">{videoCount ?? 0}</p>
          <Link href="/app/video" className="text-sm text-emerald-700 hover:underline">
            Generează video →
          </Link>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-neutral-500">Link meniu</p>
          <p className="truncate font-mono text-sm">{menuUrl}</p>
          <p className="mt-1 text-xs text-neutral-500">
            Printează QR-ul și pune-l pe mese.
          </p>
        </div>
      </div>

      <details className="rounded-xl bg-white p-6 shadow-sm">
        <summary className="cursor-pointer font-semibold">
          Setările restaurantului
        </summary>
        <form action={updateRestaurant} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="s_name" className="mb-1 block text-sm font-medium">
              Nume
            </label>
            <input
              id="s_name"
              name="name"
              defaultValue={restaurant.name}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="s_phone" className="mb-1 block text-sm font-medium">
              Telefon
            </label>
            <input
              id="s_phone"
              name="phone"
              defaultValue={restaurant.phone ?? ""}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="s_address" className="mb-1 block text-sm font-medium">
              Adresă
            </label>
            <input
              id="s_address"
              name="address"
              defaultValue={restaurant.address ?? ""}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="s_desc" className="mb-1 block text-sm font-medium">
              Descriere scurtă
            </label>
            <textarea
              id="s_desc"
              name="description"
              rows={2}
              defaultValue={restaurant.description ?? ""}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="s_logo" className="mb-1 block text-sm font-medium">
              Logo (înlocuiește)
            </label>
            <input id="s_logo" name="logo" type="file" accept="image/*" className="text-sm" />
          </div>
          <div className="flex items-end gap-6">
            <div>
              <label htmlFor="s_color" className="mb-1 block text-sm font-medium">
                Culoare brand
              </label>
              <input
                id="s_color"
                name="brand_color"
                type="color"
                defaultValue={restaurant.brand_color}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_published"
                defaultChecked={restaurant.is_published}
              />
              Meniu publicat
            </label>
          </div>
          <div className="sm:col-span-2">
            <button className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              Salvează setările
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
