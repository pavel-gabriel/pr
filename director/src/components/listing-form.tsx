import type { City, Listing, ListingCategory, ListingTag } from "@/lib/types";

/** Câmpurile comune pentru adăugarea/editarea unei listări. */
export function ListingFormFields({
  categories,
  cities,
  tags,
  listing,
  selectedTagIds = [],
}: {
  categories: ListingCategory[];
  cities: City[];
  tags: ListingTag[];
  listing?: Listing;
  selectedTagIds?: string[];
}) {
  const input =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-orange-600 focus:outline-none";
  return (
    <>
      <div className="sm:col-span-2">
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          Numele afacerii *
        </label>
        <input id="name" name="name" required defaultValue={listing?.name} className={input} />
      </div>

      {!listing && (
        <>
          <div>
            <label htmlFor="category_id" className="mb-1 block text-sm font-medium">
              Categorie *
            </label>
            <select id="category_id" name="category_id" required className={input}>
              <option value="">Alege…</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="city_id" className="mb-1 block text-sm font-medium">
              Oraș *
            </label>
            <select id="city_id" name="city_id" required className={input}>
              <option value="">Alege…</option>
              {cities
                .filter((c) => c.is_active)
                .map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
            </select>
          </div>
        </>
      )}

      <div className="sm:col-span-2">
        <label htmlFor="description" className="mb-1 block text-sm font-medium">
          Descriere
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={listing?.description ?? ""}
          placeholder="Ce faceți, ce vă diferențiază, pentru cine..."
          className={input}
        />
      </div>

      <div>
        <label htmlFor="address" className="mb-1 block text-sm font-medium">
          Adresă
        </label>
        <input id="address" name="address" defaultValue={listing?.address ?? ""} className={input} />
      </div>
      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium">
          Telefon
        </label>
        <input id="phone" name="phone" type="tel" defaultValue={listing?.phone ?? ""} className={input} />
      </div>
      <div>
        <label htmlFor="website" className="mb-1 block text-sm font-medium">
          Website
        </label>
        <input
          id="website"
          name="website"
          placeholder="https://..."
          defaultValue={listing?.website ?? ""}
          className={input}
        />
      </div>
      <div>
        <label htmlFor="program" className="mb-1 block text-sm font-medium">
          Program
        </label>
        <input
          id="program"
          name="program"
          placeholder="L-V 9-18, S 10-14"
          defaultValue={listing?.program ?? ""}
          className={input}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="google_maps_url" className="mb-1 block text-sm font-medium">
          Link Google Maps (pentru recenzii)
        </label>
        <input
          id="google_maps_url"
          name="google_maps_url"
          placeholder="https://maps.app.goo.gl/..."
          defaultValue={listing?.google_maps_url ?? ""}
          className={input}
        />
      </div>
      <div>
        <label htmlFor="google_rating" className="mb-1 block text-sm font-medium">
          Rating Google (1–5)
        </label>
        <input
          id="google_rating"
          name="google_rating"
          type="number"
          step="0.1"
          min="1"
          max="5"
          defaultValue={listing?.google_rating ?? ""}
          className={input}
        />
      </div>
      <div>
        <label htmlFor="google_rating_count" className="mb-1 block text-sm font-medium">
          Nr. recenzii Google
        </label>
        <input
          id="google_rating_count"
          name="google_rating_count"
          type="number"
          min="0"
          defaultValue={listing?.google_rating_count ?? ""}
          className={input}
        />
      </div>

      <fieldset className="sm:col-span-2">
        <legend className="mb-1 text-sm font-medium">
          Specialități (pentru paginile „unde mănânci / ce bei”)
        </legend>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <label
              key={tag.id}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-sm has-checked:border-orange-600 has-checked:bg-orange-50"
            >
              <input
                type="checkbox"
                name="tags"
                value={tag.id}
                defaultChecked={selectedTagIds.includes(tag.id)}
                className="accent-orange-600"
              />
              {tag.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="sm:col-span-2">
        <label htmlFor="images" className="mb-1 block text-sm font-medium">
          Poze (până la 8, max 5MB fiecare)
        </label>
        <input id="images" name="images" type="file" accept="image/*" multiple className="text-sm" />
      </div>
    </>
  );
}
