import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, type MenuCategory, type MenuItem, type Restaurant } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurants")
    .select("name, description")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return {
    title: data ? `Meniu ${data.name}` : "Meniu",
    description: data?.description ?? undefined,
  };
}

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: restaurant } = (await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle()) as { data: Restaurant | null };
  if (!restaurant) notFound();

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
      .eq("is_available", true)
      .order("sort_order")
      .order("created_at"),
  ]);

  const cats = (categories ?? []) as MenuCategory[];
  const menuItems = (items ?? []) as MenuItem[];
  const brand = restaurant.brand_color;

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-white pb-16">
      {/* Antet restaurant */}
      <header
        className="px-5 pb-6 pt-10 text-center text-white"
        style={{ backgroundColor: brand }}
      >
        {restaurant.logo_url && (
          <Image
            src={restaurant.logo_url}
            alt={restaurant.name}
            width={72}
            height={72}
            className="mx-auto mb-3 h-18 w-18 rounded-full border-2 border-white/60 object-cover"
          />
        )}
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        {restaurant.description && (
          <p className="mt-1 text-sm text-white/85">{restaurant.description}</p>
        )}
        {(restaurant.address || restaurant.phone) && (
          <p className="mt-2 text-xs text-white/70">
            {restaurant.address}
            {restaurant.address && restaurant.phone && " · "}
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="underline">
                {restaurant.phone}
              </a>
            )}
          </p>
        )}
      </header>

      {/* Navigație categorii */}
      {cats.length > 1 && (
        <nav className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-neutral-100 bg-white px-4 py-3">
          {cats.map((cat) => (
            <a
              key={cat.id}
              href={`#cat-${cat.id}`}
              className="whitespace-nowrap rounded-full border border-neutral-200 px-4 py-1.5 text-sm font-medium hover:border-neutral-400"
            >
              {cat.name}
            </a>
          ))}
        </nav>
      )}

      {/* Meniul */}
      <div className="px-4">
        {cats.map((cat) => {
          const catItems = menuItems.filter((i) => i.category_id === cat.id);
          if (catItems.length === 0) return null;
          return (
            <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-16 pt-8">
              <h2 className="mb-4 text-lg font-bold" style={{ color: brand }}>
                {cat.name}
              </h2>
              <div className="space-y-5">
                {catItems.map((item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-neutral-100 shadow-sm"
                  >
                    {/* Video AI dacă există, altfel poza */}
                    {item.video_url ? (
                      <video
                        src={item.video_url}
                        poster={item.image_url ?? undefined}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="aspect-video w-full object-cover"
                      />
                    ) : (
                      item.image_url && (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          width={640}
                          height={360}
                          className="aspect-video w-full object-cover"
                        />
                      )
                    )}
                    <div className="p-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-semibold">{item.name}</h3>
                        <span
                          className="whitespace-nowrap font-bold"
                          style={{ color: brand }}
                        >
                          {formatPrice(item.price_cents, item.currency)}
                        </span>
                      </div>
                      {item.name_en && (
                        <p className="text-sm italic text-neutral-400">{item.name_en}</p>
                      )}
                      {item.description && (
                        <p className="mt-1 text-sm text-neutral-600">{item.description}</p>
                      )}
                      {item.allergens.length > 0 && (
                        <p className="mt-2 text-xs text-neutral-400">
                          Alergeni: {item.allergens.join(", ")}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="mt-12 px-4 text-center text-xs text-neutral-400">
        Meniu digital de la{" "}
        <Link href="/" className="underline hover:text-neutral-600">
          FTF Consulting
        </Link>
      </footer>
    </main>
  );
}
