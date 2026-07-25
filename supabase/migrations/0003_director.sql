-- FTF Director — „vitrina orașelor”: schema pentru directorul local de afaceri.
-- Oraș pilot: Iași; modelul e național (orașele sunt date, nu hardcodate).

-- ── Orașe ────────────────────────────────────────────────────────────────
create table public.cities (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  county text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.cities enable row level security;
create policy "Orașele sunt publice" on public.cities for select using (true);

-- ── Categorii de afaceri ─────────────────────────────────────────────────
create table public.listing_categories (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  icon text not null default '🏪',
  sort_order int not null default 0
);

alter table public.listing_categories enable row level security;
create policy "Categoriile sunt publice" on public.listing_categories for select using (true);

-- ── Specialități (descoperire pe „ce mănânci / ce bei”) ─────────────────
create table public.listing_tags (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind text not null default 'mancare' check (kind in ('mancare', 'bautura', 'altele'))
);

alter table public.listing_tags enable row level security;
create policy "Specialitățile sunt publice" on public.listing_tags for select using (true);

-- ── Listări (profilurile firmelor) ───────────────────────────────────────
create table public.listings (
  id uuid primary key default gen_random_uuid (),
  -- null = profil seed nerevendicat; se leagă la aprobare a revendicării
  owner_id uuid references auth.users (id) on delete set null,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category_id uuid not null references public.listing_categories (id),
  city_id uuid not null references public.cities (id),
  description text,
  address text,
  phone text,
  email text,
  website text,
  google_maps_url text,
  -- introduse manual la seed / de proprietar; sursa recenziilor e Google
  google_rating numeric(2, 1) check (google_rating between 1 and 5),
  google_rating_count int check (google_rating_count >= 0),
  images text[] not null default '{}',
  video_url text,
  program text,
  status text not null default 'pending'
    check (status in ('draft', 'pending', 'approved', 'rejected')),
  is_featured boolean not null default false,
  featured_until timestamptz,
  created_at timestamptz not null default now()
);

create index listings_city_category_idx on public.listings (city_id, category_id, status);
create index listings_owner_idx on public.listings (owner_id);

alter table public.listings enable row level security;

create policy "Listările aprobate sunt publice" on public.listings
  for select using (status = 'approved' or owner_id = auth.uid ());

create policy "Utilizatorii propun listări" on public.listings
  for insert with check (
    owner_id = auth.uid ()
    and status = 'pending'
    and is_featured = false
  );
-- Editările și moderarea trec prin server (service role), ca proprietarii
-- să nu-și poată seta singuri is_featured/status prin API.

-- ── Legătura listare ↔ specialități ─────────────────────────────────────
create table public.listing_tag_map (
  listing_id uuid not null references public.listings (id) on delete cascade,
  tag_id uuid not null references public.listing_tags (id) on delete cascade,
  primary key (listing_id, tag_id)
);

alter table public.listing_tag_map enable row level security;
create policy "Etichetele listărilor sunt publice" on public.listing_tag_map
  for select using (true);

-- ── Statistici de vizite (agregat zilnic) ────────────────────────────────
create table public.listing_views (
  listing_id uuid not null references public.listings (id) on delete cascade,
  day date not null default current_date,
  views int not null default 0,
  primary key (listing_id, day)
);

alter table public.listing_views enable row level security;
-- Doar prin server (service role): incrementare + citire pentru proprietar.

create or replace function public.increment_listing_view(p_listing_id uuid)
returns void
language sql
security definer set search_path = ''
as $$
  insert into public.listing_views (listing_id, day, views)
  values (p_listing_id, current_date, 1)
  on conflict (listing_id, day) do update set views = public.listing_views.views + 1;
$$;

-- ── Cereri de revendicare a profilurilor seed ────────────────────────────
create table public.listing_claims (
  id uuid primary key default gen_random_uuid (),
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  message text,
  status text not null default 'new' check (status in ('new', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.listing_claims enable row level security;
-- Doar prin server (service role).

-- ── Bucket pentru pozele listărilor ──────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

create policy "Pozele listărilor sunt publice" on storage.objects
  for select using (bucket_id = 'listing-images');

create policy "Utilizatorii autentificați încarcă poze de listare" on storage.objects
  for insert with check (
    bucket_id = 'listing-images' and auth.role () = 'authenticated'
  );

-- ── Seed: orașe (pilotul Iași e activ) ───────────────────────────────────
insert into public.cities (name, slug, county, is_active) values
  ('Iași', 'iasi', 'Iași', true),
  ('București', 'bucuresti', 'București', false),
  ('Cluj-Napoca', 'cluj-napoca', 'Cluj', false),
  ('Timișoara', 'timisoara', 'Timiș', false),
  ('Brașov', 'brasov', 'Brașov', false),
  ('Constanța', 'constanta', 'Constanța', false),
  ('Sibiu', 'sibiu', 'Sibiu', false),
  ('Oradea', 'oradea', 'Bihor', false),
  ('Craiova', 'craiova', 'Dolj', false),
  ('Galați', 'galati', 'Galați', false);

-- ── Seed: categorii ──────────────────────────────────────────────────────
insert into public.listing_categories (name, slug, icon, sort_order) values
  ('Restaurante', 'restaurante', '🍽️', 1),
  ('Cafenele', 'cafenele', '☕', 2),
  ('Baruri & Pub-uri', 'baruri', '🍺', 3),
  ('Cofetării & Patiserii', 'cofetarii', '🍰', 4),
  ('Fast-food & Street food', 'street-food', '🌯', 5),
  ('Frumusețe & Saloane', 'frumusete', '💇', 6),
  ('Sănătate & Clinici', 'sanatate', '🩺', 7),
  ('Fitness & Sport', 'fitness', '🏋️', 8),
  ('Auto & Service', 'auto', '🚗', 9),
  ('Construcții & Amenajări', 'constructii', '🧱', 10),
  ('Imobiliare', 'imobiliare', '🏠', 11),
  ('IT & Digital', 'it-digital', '💻', 12),
  ('Educație & Cursuri', 'educatie', '🎓', 13),
  ('Evenimente & Foto', 'evenimente', '📸', 14),
  ('Magazine & Retail', 'magazine', '🛍️', 15),
  ('Turism & Cazare', 'turism', '🧳', 16),
  ('Servicii profesionale', 'servicii', '💼', 17);

-- ── Seed: specialități („unde mănânci X / unde bei Y”) ──────────────────
insert into public.listing_tags (name, slug, kind) values
  ('Ramen', 'ramen', 'mancare'),
  ('Sushi', 'sushi', 'mancare'),
  ('Pizza napoletană', 'pizza-napoletana', 'mancare'),
  ('Burgeri', 'burgeri', 'mancare'),
  ('Shaorma & kebab', 'shaorma', 'mancare'),
  ('Brunch & mic dejun', 'brunch', 'mancare'),
  ('Vegan & vegetarian', 'vegan', 'mancare'),
  ('Pește & fructe de mare', 'peste-fructe-de-mare', 'mancare'),
  ('Steak & grill', 'steak', 'mancare'),
  ('Paste proaspete', 'paste', 'mancare'),
  ('Bucătărie românească', 'romaneasca', 'mancare'),
  ('Deserturi artizanale', 'deserturi', 'mancare'),
  ('Înghețată artizanală', 'inghetata', 'mancare'),
  ('Cafea de specialitate', 'cafea-de-specialitate', 'bautura'),
  ('Bere artizanală', 'bere-artizanala', 'bautura'),
  ('Vinuri & cramă', 'vinuri', 'bautura'),
  ('Cocktailuri', 'cocktailuri', 'bautura'),
  ('Ceai & matcha', 'ceai-matcha', 'bautura'),
  ('Fresh-uri & smoothie', 'fresh-smoothie', 'bautura');
