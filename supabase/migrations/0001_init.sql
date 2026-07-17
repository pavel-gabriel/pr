-- FTF Platform — schema inițială
-- Rulează în Supabase: SQL Editor → paste → Run (sau `supabase db push`).

-- ── Profiluri utilizatori ────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profil propriu vizibil" on public.profiles
  for select using (auth.uid () = id);

create policy "Profil propriu editabil" on public.profiles
  for update using (auth.uid () = id);

-- Creează automat profilul la înregistrare
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user ();

-- ── Restaurante ──────────────────────────────────────────────────────────
create table public.restaurants (
  id uuid primary key default gen_random_uuid (),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  logo_url text,
  brand_color text not null default '#059669',
  address text,
  phone text,
  is_published boolean not null default true,
  plan text not null default 'trial' check (plan in ('trial', 'start', 'pro')),
  created_at timestamptz not null default now()
);

create index restaurants_owner_idx on public.restaurants (owner_id);

alter table public.restaurants enable row level security;

create policy "Restaurantele publicate sunt publice" on public.restaurants
  for select using (is_published or auth.uid () = owner_id);

create policy "Proprietarul creează" on public.restaurants
  for insert with check (auth.uid () = owner_id);

create policy "Proprietarul editează" on public.restaurants
  for update using (auth.uid () = owner_id);

create policy "Proprietarul șterge" on public.restaurants
  for delete using (auth.uid () = owner_id);

-- ── Categorii de meniu ───────────────────────────────────────────────────
create table public.menu_categories (
  id uuid primary key default gen_random_uuid (),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index menu_categories_restaurant_idx on public.menu_categories (restaurant_id);

alter table public.menu_categories enable row level security;

create policy "Categoriile meniurilor publicate sunt publice" on public.menu_categories
  for select using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and (r.is_published or r.owner_id = auth.uid ())
    )
  );

create policy "Proprietarul gestionează categoriile" on public.menu_categories
  for all using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid ()
    )
  );

-- ── Preparate ────────────────────────────────────────────────────────────
create table public.menu_items (
  id uuid primary key default gen_random_uuid (),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid not null references public.menu_categories (id) on delete cascade,
  name text not null,
  name_en text,
  description text,
  description_en text,
  price_cents int not null check (price_cents >= 0),
  currency text not null default 'RON',
  image_url text,
  video_url text,
  allergens text[] not null default '{}',
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index menu_items_restaurant_idx on public.menu_items (restaurant_id);
create index menu_items_category_idx on public.menu_items (category_id);

alter table public.menu_items enable row level security;

create policy "Preparatele meniurilor publicate sunt publice" on public.menu_items
  for select using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and (r.is_published or r.owner_id = auth.uid ())
    )
  );

create policy "Proprietarul gestionează preparatele" on public.menu_items
  for all using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid ()
    )
  );

-- ── Joburi de generare video AI ──────────────────────────────────────────
create table public.video_jobs (
  id uuid primary key default gen_random_uuid (),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  source_image_url text not null,
  prompt text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  provider_request_id text,
  result_video_url text,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index video_jobs_restaurant_idx on public.video_jobs (restaurant_id, created_at desc);
create index video_jobs_provider_idx on public.video_jobs (provider_request_id);

alter table public.video_jobs enable row level security;

create policy "Proprietarul își vede joburile" on public.video_jobs
  for select using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid ()
    )
  );

create policy "Proprietarul creează joburi" on public.video_jobs
  for insert with check (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid ()
    )
  );

-- ── Audituri SEO (publice, self-service) ─────────────────────────────────
create table public.seo_audits (
  id uuid primary key default gen_random_uuid (),
  url text not null,
  email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'failed')),
  score int,
  results jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index seo_audits_url_idx on public.seo_audits (url, created_at desc);

alter table public.seo_audits enable row level security;
-- Fără politici pentru anon/authenticated: auditurile se creează și se
-- citesc exclusiv prin server (service role), raportul fiind accesibil
-- doar prin link-ul cu UUID.

-- ── Cereri de servicii (lead-uri din audituri) ───────────────────────────
create table public.service_requests (
  id uuid primary key default gen_random_uuid (),
  audit_id uuid references public.seo_audits (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  message text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'offer_sent', 'won', 'lost')),
  created_at timestamptz not null default now()
);

alter table public.service_requests enable row level security;
-- La fel: doar prin server (service role).

-- ── Abonamente (oglindă Stripe) ──────────────────────────────────────────
create table public.subscriptions (
  id uuid primary key default gen_random_uuid (),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan text not null check (plan in ('start', 'pro')),
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_restaurant_idx on public.subscriptions (restaurant_id);

alter table public.subscriptions enable row level security;

create policy "Proprietarul își vede abonamentul" on public.subscriptions
  for select using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid ()
    )
  );

-- ── Bucket-uri Storage ───────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true), ('menu-videos', 'menu-videos', true)
on conflict (id) do nothing;

create policy "Poze publice la citire" on storage.objects
  for select using (bucket_id in ('menu-images', 'menu-videos'));

create policy "Utilizatorii autentificați încarcă poze" on storage.objects
  for insert with check (
    bucket_id = 'menu-images' and auth.role () = 'authenticated'
  );

create policy "Utilizatorii își șterg pozele" on storage.objects
  for delete using (
    bucket_id = 'menu-images' and auth.uid () = owner
  );
