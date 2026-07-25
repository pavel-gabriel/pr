-- Studio de promovare: video promoțional din poze (orice afacere, nu doar
-- meniuri) + texte de promovare generate cu AI. Resursele aparțin
-- utilizatorului (owner_id), nu restaurantului — Studio-ul funcționează și
-- fără un restaurant creat.

-- ── Clipuri video promoționale ───────────────────────────────────────────
create table public.promo_videos (
  id uuid primary key default gen_random_uuid (),
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'locatie'
    check (kind in ('locatie', 'produs', 'mancare', 'eveniment', 'joc', 'altele')),
  source_image_urls text[] not null default '{}',
  prompt text,
  aspect_ratio text not null default '16:9'
    check (aspect_ratio in ('16:9', '9:16', '1:1')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  provider_request_id text,
  result_video_url text,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index promo_videos_owner_idx on public.promo_videos (owner_id, created_at desc);
create index promo_videos_provider_idx on public.promo_videos (provider_request_id);

alter table public.promo_videos enable row level security;

create policy "Utilizatorul își vede clipurile promo" on public.promo_videos
  for select using (owner_id = auth.uid ());
-- Scrierile trec prin server (service role), după verificarea cotelor.

-- ── Texte de promovare generate ──────────────────────────────────────────
create table public.promo_texts (
  id uuid primary key default gen_random_uuid (),
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('postare', 'recenzie', 'descriere', 'anunt')),
  input jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index promo_texts_owner_idx on public.promo_texts (owner_id, created_at desc);

alter table public.promo_texts enable row level security;

create policy "Utilizatorul își vede textele promo" on public.promo_texts
  for select using (owner_id = auth.uid ());

-- ── Bucket pentru pozele sursă din Studio ────────────────────────────────
insert into storage.buckets (id, name, public)
values ('promo-images', 'promo-images', true)
on conflict (id) do nothing;

create policy "Pozele promo sunt publice la citire" on storage.objects
  for select using (bucket_id = 'promo-images');

create policy "Utilizatorii autentificați încarcă poze promo" on storage.objects
  for insert with check (
    bucket_id = 'promo-images' and auth.role () = 'authenticated'
  );
