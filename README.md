# FlowInventory

FlowInventory eshte nje PWA per menaxhimin e mungesave dhe porosive ne farmaci, me role te ndara per `OWNER`, `MANAGER` dhe `WORKER`.

Stack-u kryesor:

- `Vite`
- `TypeScript`
- `Supabase` (`Auth`, `Postgres`, `Realtime`)
- `xlsx`
- `jspdf`
- `vite-plugin-pwa`

## Cfare ben aplikacioni

- `WORKER` kerkon produkte dhe shton mungesa shpejt
- `OWNER` menaxhon dashboard-in, mungesat, porosite, importin, kompanine dhe ekipen
- `MANAGER` ka qasje ne dashboard, mungesat dhe porosite, por jo ne seksionet owner-only
- mungesat grupohen sipas furnitorit per gjenerim porosish
- porosite mund te kopjohen, shkarkohen si PDF dhe te shenohen si `SENT`
- te dhenat jane te ndara sipas kompanise
- `public.mungesat` perdoret me `Realtime`

## Rruget kryesore

Aplikacioni perdor hash routing.

| Rruga | Pershkrimi |
| --- | --- |
| `#/kycu` | Login |
| `#/mungesat` | Paneli i worker-it |
| `#/pronari` | Dashboard i owner/manager |
| `#/pronari/mungesat` | Mungesat per owner/manager |
| `#/porosite` | Porosite |
| `#/import` | Import dhe produkte |
| `#/profile` | Profili i llogarise |
| `#/kompania` | Detajet e kompanise |
| `#/ekipa` | Ekipi |
| `#/settings` | Settings |

Shenim:

- `MANAGER` nuk duhet te hyje ne `#/import`, `#/kompania`, `#/ekipa`, `#/settings`
- `WORKER` ridrejtohet te `#/mungesat`

## Setup lokal

1. Instalo varshmerite:

```bash
npm ci
```

2. Krijo `.env` nga `.env.example`

```env
VITE_SUPABASE_URL=https://projekti.supabase.co
VITE_SUPABASE_ANON_KEY=anon_key_ketu
```

3. Nise aplikacionin:

```bash
npm run dev
```

4. Build produksioni:

```bash
npm run build
```

Output-i i build-it gjendet ne folderin `out`.

## Supabase

Per me e perdorur app-in si duhet, projekti pret:

- tabelat dhe RPC-te nga `supabase/migrations/`
- `profiles.role` me nje nga vlerat: `OWNER`, `MANAGER`, `WORKER`
- `profiles.company_id` te vendosur sakte
- `Realtime` aktiv per `public.mungesat`

Dokumente ndihmese:

- `SUPABASE_SETUP.md`
- `MULTI_TENANCY_TEST_GUIDE.md`
- `supabase/migrations/`

## Deploy

Per deploy si static site:

1. Build command:

```bash
npm ci && npm run build
```

2. Publish directory:

```text
out
```

3. Environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Nese perdoret OAuth, shto URL-te perkatese te projektit te deploy-uar te `Supabase Auth`.

## Scripts

| Script | Pershkrimi |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview i build-it |

## Verifikim

Aktualisht repo-ja nuk ka suite automatike testesh (`test`, `spec`, `e2e`).

Kontrollet praktike qe duhen perdorur:

```bash
npx tsc --noEmit
npm run build
```

Pastaj duhen testuar manualisht ne browser:

- login per `OWNER`, `MANAGER`, `WORKER`
- shtim mungese nga worker
- reflektim i mungeses te owner pa refresh manual
- gjenerim porosish sipas furnitorit
- PDF / copy / mark sent
- izolimi i te dhenave sipas kompanise
- mobile layout

## Struktura e rendesishme

| Path | Roli |
| --- | --- |
| `src/main.ts` | Routing dhe startup lifecycle |
| `src/pages/login.ts` | Login UI |
| `src/pages/mungesat.ts` | Worker page |
| `src/pages/pronari.ts` | Owner/manager page |
| `src/lib/auth.ts` | Auth, profile, redirects |
| `src/lib/data.ts` | Data access, shortages, orders, dashboard |
| `src/style.css` | Global styles dhe responsive layout |

## Shenime

- projekti eshte optimizuar qe navigimi mes seksioneve owner te mos beje full remount sa here nderrohet hash route
- refresh-i ne localhost ben cleanup te cache/service worker vetem nje here per session
- build-i i prod-it perdor `out`, jo `dist`
