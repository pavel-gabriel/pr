import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, type MenuCategory, type MenuItem } from "@/lib/types";
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  getOwnedRestaurant,
  updateItem,
} from "../actions";
import { redirect } from "next/navigation";

export const metadata = { title: "Gestionare meniu" };

export default async function MenuAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const restaurant = await getOwnedRestaurant();
  if (!restaurant) redirect("/app");

  const supabase = await createClient();
  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order")
      .order("created_at"),
  ]);

  const cats = (categories ?? []) as MenuCategory[];
  const menuItems = (items ?? []) as MenuItem[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Meniul: {restaurant.name}</h1>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Adaugă categorie */}
      <form
        action={createCategory}
        className="mb-8 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm"
      >
        <div className="grow">
          <label htmlFor="cat_name" className="mb-1 block text-sm font-medium">
            Categorie nouă (ex: Aperitive, Paste, Desert)
          </label>
          <input
            id="cat_name"
            name="name"
            required
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Adaugă categoria
        </button>
      </form>

      {cats.length === 0 && (
        <p className="text-neutral-600">
          Începe prin a adăuga o categorie — apoi adaugi preparatele în ea.
        </p>
      )}

      {cats.map((cat) => {
        const catItems = menuItems.filter((i) => i.category_id === cat.id);
        return (
          <section key={cat.id} className="mb-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{cat.name}</h2>
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={cat.id} />
                <button className="text-sm text-neutral-400 hover:text-red-600">
                  Șterge categoria
                </button>
              </form>
            </div>

            {/* Preparatele categoriei */}
            <div className="space-y-3">
              {catItems.map((item) => (
                <details key={item.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <summary className="flex cursor-pointer items-center gap-4">
                    {item.image_url && (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    )}
                    <span className="grow font-medium">
                      {item.name}
                      {!item.is_available && (
                        <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                          indisponibil
                        </span>
                      )}
                      {item.video_url && (
                        <span className="ml-2 rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                          🎬 video
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-neutral-600">
                      {formatPrice(item.price_cents, item.currency)}
                    </span>
                  </summary>

                  <form action={updateItem} className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="id" value={item.id} />
                    <input
                      name="name"
                      defaultValue={item.name}
                      placeholder="Nume"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <input
                      name="name_en"
                      defaultValue={item.name_en ?? ""}
                      placeholder="Nume (EN, opțional)"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <textarea
                      name="description"
                      defaultValue={item.description ?? ""}
                      placeholder="Descriere"
                      rows={2}
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:col-span-2"
                    />
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={(item.price_cents / 100).toFixed(2)}
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <input
                      name="allergens"
                      defaultValue={item.allergens.join(", ")}
                      placeholder="Alergeni (gluten, lactoză...)"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <div className="flex items-center gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="is_available"
                          defaultChecked={item.is_available}
                        />
                        Disponibil
                      </label>
                      <input name="image" type="file" accept="image/*" className="text-sm" />
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                        Salvează
                      </button>
                    </div>
                  </form>
                  <form action={deleteItem} className="mt-2 text-right">
                    <input type="hidden" name="id" value={item.id} />
                    <button className="text-sm text-neutral-400 hover:text-red-600">
                      Șterge preparatul
                    </button>
                  </form>
                </details>
              ))}
            </div>

            {/* Adaugă preparat */}
            <details className="mt-3 rounded-xl border border-dashed border-neutral-300 p-4">
              <summary className="cursor-pointer text-sm font-medium text-emerald-700">
                + Adaugă preparat în „{cat.name}”
              </summary>
              <form action={createItem} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="category_id" value={cat.id} />
                <input
                  name="name"
                  required
                  placeholder="Nume preparat *"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Preț (lei) *"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  name="name_en"
                  placeholder="Nume (EN, opțional)"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:col-span-2"
                />
                <textarea
                  name="description"
                  placeholder="Descriere (ingrediente, gramaj)"
                  rows={2}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:col-span-2"
                />
                <input
                  name="allergens"
                  placeholder="Alergeni, separați prin virgulă"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <div className="flex items-center gap-3">
                  <input name="image" type="file" accept="image/*" className="grow text-sm" />
                  <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                    Adaugă
                  </button>
                </div>
              </form>
            </details>
          </section>
        );
      })}
    </div>
  );
}
