-- Studio de promovare: afișe generate (print A4 sau formate social media)
create table public.promo_posters (
  id uuid primary key default gen_random_uuid (),
  owner_id uuid not null references auth.users (id) on delete cascade,
  format text not null default 'a4' check (format in ('a4', 'patrat', 'story')),
  style text not null default 'bold' check (style in ('bold', 'clean', 'oferta')),
  brand_color text not null default '#059669',
  -- textele și opțiunile afișului (headline, subtitle, details, cta, qr etc.)
  content jsonb not null,
  svg_url text not null,
  created_at timestamptz not null default now()
);

create index promo_posters_owner_idx on public.promo_posters (owner_id, created_at desc);

alter table public.promo_posters enable row level security;

create policy "Utilizatorul își vede afișele" on public.promo_posters
  for select using (owner_id = auth.uid ());
-- Scrierile trec prin server (service role).
