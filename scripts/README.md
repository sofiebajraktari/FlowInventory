# Skriptat SQL (`scripts/`)

## `schema.sql`

- Përmbledhje e tabelave: `profiles`, `suppliers`, `products`, `mungesat`, `orders`, `order_items`.
- **RLS** + politika sipas rolit (punëtori: kryesisht INSERT mungesash + RPC; pronari: shkrim i plotë).
- Funksione: `add_mungese` (dedup), `last_final_qty_by_product` (lexim i kufizuar për sugjerim sasie).
- **Realtime:** koment për `supabase_realtime` / `mungesat`.

**Ekzekutim:** Supabase → SQL Editor → ngjit `schema.sql` → Run.

## Përputhje me migrimet në `supabase/migrations/`

Në zhvillim zakonisht përdoren migrimet (rend sipas datës në emër). Nëse ke nisur nga `schema.sql` dhe mungon RLS i fundit:

1. Ekzekuto edhe përmbajtjen e `../supabase/migrations/20260324120000_rls_worker_orders_read.sql`  
   (heq `SELECT` të hapur për `orders`/`order_items` nga punëtori + RPC).

## Pas skemës

- Përdoruesi i ri: shpesh `WORKER` nga trigger; ndrysho në **`profiles.role = 'OWNER'`** për pronarin.
- Aktivizo **Realtime** për tabelën **`mungesat`**.
