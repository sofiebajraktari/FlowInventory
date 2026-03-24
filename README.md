# FlowInventory

PWA për **mungesat** dhe **porositë sipas furnitorit** në farmaci (punëtor + pronar). Stack: **Vite + TypeScript + Supabase** (Auth, Postgres, Realtime).

--
---

## Ekzekutim lokal

```bash
npm ci
cp .env.example .env
```

Plotëso `.env`:
```env
VITE_SUPABASE_URL=https://PROJEKTI.supabase.co
VITE_SUPABASE_ANON_KEY=anon_key_ketu
```

```bash
npm run dev
```

Build produksioni (Render përdor të njëjtin komandë; output: folderi **`out`**):

```bash
npm run build
```

---

## Konfigurim Supabase

1. Krijo projekt në [Supabase](https://supabase.com).
2. Apliko skemën:
   - **Rekomanduar:** migrimet në `supabase/migrations/` sipas rendit të datës (`db push` ose kopjo-ngjit në SQL Editor).
   - **Alternativë:** një herë `scripts/schema.sql`, pastaj SQL nga `supabase/migrations/20260324120000_rls_worker_orders_read.sql` (RLS + RPC për sugjerim pa lexim `order_items` nga punëtori).
3. **Auth:** krijo përdorues; në tabelën **`profiles`** vendos `OWNER` ose `WORKER`.
4. **Realtime:** aktivizo për **`public.mungesat`** (Replication / publication sipas versionit të Supabase).
5. Më shumë: `SUPABASE_SETUP.md`, `scripts/README.md`.

---

## Deploy në Render (static site)

1. **New → Static Site** → lidh repo-n nga GitHub.
2. **Build command:** `npm ci && npm run build`
3. **Publish directory:** `out` (jo `dist`)
4. **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`  
   Pas ndryshimit të env, rideploy (Vite i ngul vlerat në build).

Në Supabase → **Authentication → URL Configuration**, shto URL-në e Render (`https://....onrender.com`) dhe redirect për OAuth nëse përdoret.

---

## Rrugët kryesore

 Rruga apo Përshkrimi 

| `#/kycu` | Hyrje 
| `#/regjistrohu` | Regjistrim |
| `#/mungesat` | Punëtori |
| `#/pronari` | Pronari – mungesat |
| `#/porosite` | Pronari – porositë |
| `#/import` | Pronari – import |

---

## Checklist para dorëzimit (udhëzues)

- [ ] Punëtori nuk sheh fushë për sasi (vetëm kërkim + URGJENT + shënim).
- [ ] Pronari sheh listën live (Realtime për `mungesat`).
- [ ] Dedup rrit `added_count`, një rresht për ditë/produkt.
- [ ] Gjenerimi: një `orders` për furnitor + `order_items` për çdo bar.
- [ ] Kopjo recipt → toast **«U kopjua!»**
- [ ] RLS: pa login nuk lexohen/ndryshohen të dhënat.

---

## Tech stack

Vite 6, TypeScript, Tailwind 4, `@supabase/supabase-js`, `vite-plugin-pwa`, `xlsx`, `jspdf`.
