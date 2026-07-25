import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCategories, getCities, getTags } from "@/lib/queries";
import { ListingFormFields } from "@/components/listing-form";
import type { Listing, ListingTag } from "@/lib/types";
import { removeImage, updateListing } from "../../actions";

export const metadata = { title: "Editează listarea" };

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cont");

  const { data } = await supabase
    .from("listings")
    .select("*, tags:listing_tags(*)")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!data) notFound();
  const listing = data as unknown as Listing & { tags: ListingTag[] };

  const [categories, cities, tags] = await Promise.all([
    getCategories(),
    getCities(),
    getTags(),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Editează: {listing.name}</h1>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {listing.images.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium">Pozele actuale</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {listing.images.map((img) => (
              <div key={img} className="relative">
                <Image
                  src={img}
                  alt=""
                  width={200}
                  height={133}
                  className="aspect-[3/2] w-full rounded-lg object-cover"
                />
                <form action={removeImage} className="absolute right-1 top-1">
                  <input type="hidden" name="id" value={listing.id} />
                  <input type="hidden" name="image_url" value={img} />
                  <button
                    className="rounded-full bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-red-600"
                    aria-label="Șterge poza"
                  >
                    ✕
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      <form
        action={updateListing}
        className="mt-6 grid gap-4 rounded-xl bg-white p-6 shadow-sm sm:grid-cols-2"
      >
        <input type="hidden" name="id" value={listing.id} />
        <ListingFormFields
          categories={categories}
          cities={cities}
          tags={tags}
          listing={listing}
          selectedTagIds={listing.tags.map((t) => t.id)}
        />
        <button className="rounded-lg bg-orange-600 py-2.5 font-medium text-white hover:bg-orange-700 sm:col-span-2">
          Salvează modificările
        </button>
      </form>
    </main>
  );
}
