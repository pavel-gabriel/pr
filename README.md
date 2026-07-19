# FTF Platform

Platforma de servicii digitale a [FTF Consulting](https://ftfconsulting.ro) (CAEN 7311):

1. **Meniuri digitale QR pentru restaurante** cu clipuri video generate cu AI
   din pozele preparatelor (fal.ai / Kling image-to-video) — abonament lunar.
2. **Audit SEO self-service** — clientul introduce URL-ul, primește raport cu
   scor și recomandări; lead-urile de implementare ajung în `service_requests`.
   **Studio de promovare** (`/app/studio`): video promoțional din poze pentru
   orice afacere (locație/produs/eveniment), texte de promovare și răspunsuri
   la recenzii cu AI (Claude), plus **afișe generate** (A4 print / pătrat /
   story) cu poză, QR și texte scrise opțional de AI — export SVG/PNG/print.
3. **Director local de afaceri** (`director/`, aplicație separată cu domeniu
   propriu) — „vitrina orașului”: profiluri de afaceri cu poze/video/rating
   Google, pe categorii și specialități („unde mănânci ramen în Iași”).
   Listare gratuită + plan „Promovat” lunar. Oraș pilot: Iași.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS 4
- **Supabase** — Postgres + Auth + Storage (migrații în `supabase/migrations/`)
- **fal.ai** — generare video AI (~$0.35 / clip de 5s)
- **Google PageSpeed Insights** — scoruri Lighthouse pentru audituri
- **Stripe** — abonamente (Start 149 lei/lună, Pro 249 lei/lună + setup fee)

## Pornire locală

```bash
# 1. Instalează dependențele
npm install

# 2. Creează un proiect Supabase (gratuit) și rulează migrațiile în ordine:
#    Supabase Dashboard → SQL Editor → fișierele din supabase/migrations/

# 3. Configurează mediul
cp .env.example .env
#    Completează NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#    SUPABASE_SERVICE_ROLE_KEY. Restul cheilor sunt opționale (vezi .env.example).

# 4. Pornește
npm run dev
```

Deschide http://localhost:3000 — landing, `/seo` (audit), `/register` (cont),
`/app` (dashboard), `/m/<slug>` (meniul public), `/api/qr/<slug>` (codul QR).

## Deploy (Docker pe VPS)

```bash
cp .env.example .env   # completează valorile de producție
docker compose up -d --build
```

Aplicația ascultă pe portul 3000 — pune un reverse proxy (Caddy/Nginx) cu TLS
în față. `NEXT_PUBLIC_SITE_URL` trebuie să fie URL-ul public (e folosit în
codurile QR, webhook-uri și emailuri).

### Webhook-uri de configurat în producție

| Serviciu | Endpoint | Note |
|---|---|---|
| fal.ai | `/api/video/webhook` | trimis automat la `queue.submit` |
| Stripe | `/api/stripe/webhook` | evenimente `customer.subscription.*`, `checkout.session.completed` |

În dezvoltare locală webhook-urile nu pot ajunge la `localhost` — folosește
butonul „Verifică statusul” din pagina Video AI (interoghează fal.ai direct),
respectiv `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Structura

```
src/
  app/
    page.tsx              # landing RO
    preturi/              # pagina de prețuri
    (auth)/               # login, register + server actions
    auth/callback/        # confirmare email Supabase
    app/                  # dashboard (protejat de src/proxy.ts)
      meniu/              # CRUD categorii + preparate
      video/              # generare clipuri AI + istoricul joburilor
      abonament/          # planuri + Stripe Checkout
    m/[slug]/             # meniul public (mobile-first, video autoplay)
    seo/                  # formular audit + raport + cerere ofertă
    api/
      qr/[slug]/          # cod QR PNG descărcabil
      video/webhook/      # callback fal.ai
      stripe/webhook/     # sincronizare abonamente
  lib/
    supabase/             # clienți SSR / browser / service-role
    seo/                  # verificări on-page + PageSpeed + orchestrare
    video/fal.ts          # submit + persist clipuri
    plans.ts              # limitele planurilor (sursa de adevăr: Stripe)
supabase/migrations/      # schema completă + RLS + bucket-uri storage
```

## Directorul local (`director/`)

Aplicație Next.js separată (port 3001, domeniu dedicat), care folosește
**același proiect Supabase** (aceleași conturi de utilizator; tabelele din
`supabase/migrations/0003_director.sql`).

```bash
cd director
cp .env.example .env    # aceleași chei Supabase + brandul directorului
npm install
npm run dev             # http://localhost:3001
```

Rute principale: `/` (home), `/iasi` (orașul pilot), `/iasi/restaurante`
(categorie), `/iasi/gust/ramen` (specialitate), `/firma/<slug>` (profil cu
JSON-LD LocalBusiness și contor de vizite), `/cont` (proprietari), `/admin`
(moderare listări/revendicări — necesită `profiles.is_admin`).

**Asistentul AI de recomandări**: widget de chat pe toate paginile publice —
scrii „restaurant chinezesc cu nota 4.5+” și primești recomandări din listări.
Cererea e transformată în filtre (categorie, specialități, rating minim) prin
API-ul Claude (`ANTHROPIC_API_KEY`, model implicit `claude-opus-4-8`); fără
cheie, endpoint-ul `/api/asistent` folosește un parser local mai simplu, deci
funcționează și fără AI. Rate limit 10 cereri/min per IP.

Deploy: `docker compose --profile director up -d --build`. Pentru planul
„Promovat” configurează `STRIPE_PRICE_FEATURED` + un webhook Stripe separat
către `<domeniul-directorului>/api/stripe/webhook`.

## Verificări

```bash
npm run lint && npm run build            # platforma
cd director && npm run lint && npm run build   # directorul
```

CI-ul (GitHub Actions) rulează lint + build pentru ambele aplicații la fiecare push.
