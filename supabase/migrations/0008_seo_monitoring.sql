-- Monitorizare SEO cu raport lunar — serviciu monetizat (plată unică sau
-- abonament Stripe). Un monitor urmărește un URL; fiecare rulare produce un
-- rând în seo_reports legat de auditul complet din seo_audits.

create table public.seo_monitors (
  id uuid primary key default gen_random_uuid (),
  -- contul care a cumpărat (dacă era logat) — accesul merge și pe link+email
  owner_id uuid references auth.users (id) on delete set null,
  -- auditul gratuit din care s-a pornit monitorizarea
  audit_id uuid references public.seo_audits (id) on delete set null,
  url text not null,
  email text not null,
  billing text not null check (billing in ('one_time', 'subscription')),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'canceled', 'expired')),
  stripe_customer_id text,
  stripe_subscription_id text,
  -- până când e plătit accesul (abonament: capătul perioadei curente)
  paid_until timestamptz,
  last_report_at timestamptz,
  created_at timestamptz not null default now()
);

create index seo_monitors_email_idx on public.seo_monitors (email, created_at desc);
create index seo_monitors_sub_idx on public.seo_monitors (stripe_subscription_id);
create index seo_monitors_due_idx on public.seo_monitors (status, last_report_at);

alter table public.seo_monitors enable row level security;

create policy "Proprietarul își vede monitorizările" on public.seo_monitors
  for select using (owner_id = auth.uid ());
-- Restul accesului (link cu UUID + email) și toate scrierile: prin server.

create table public.seo_reports (
  id uuid primary key default gen_random_uuid (),
  monitor_id uuid not null references public.seo_monitors (id) on delete cascade,
  audit_id uuid not null references public.seo_audits (id) on delete cascade,
  score int,
  previous_score int,
  created_at timestamptz not null default now()
);

create index seo_reports_monitor_idx on public.seo_reports (monitor_id, created_at desc);

alter table public.seo_reports enable row level security;
-- Doar prin server (service role) — pagina monitorului e pe link cu UUID.
