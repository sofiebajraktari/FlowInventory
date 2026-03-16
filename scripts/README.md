# Skriptat FlowInventory

## Si të ekzekutosh skemën

1. Hap **Supabase Dashboard** → **SQL Editor** → **New query**.
2. Kopjo të gjithë përmbajtjen e `schema.sql` dhe ngjite.
3. Kliko **Run**.

## Pas ekzekutimit

- **Profiles:** Çdo user i ri merr automatikisht rolin `WORKER`. Për të pasur një pronar:
  - Krijo një llogari nga aplikacioni (ose nga Auth në Supabase).
  - Në **Table Editor** → **profiles** gjej atë user dhe ndrysho `role` në `OWNER`.

- **Realtime:** Nëse dalin gabime për `supabase_realtime`, në Dashboard shko te **Database** → **Replication** dhe aktivizo Realtime për tabelën `mungesat`.

## Përputhje me udhëzuesin

- Tabelat: `profiles`, `suppliers`, `products`, `mungesat`, `orders`, `order_items`.
- RLS: vetëm të kyçur; punëtori vetëm INSERT te `mungesat`; pronari bën gjithçka.
