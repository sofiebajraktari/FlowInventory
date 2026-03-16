-- ============================================================
-- FlowInventory – Schema i plotë Supabase (sipas udhëzuesit)
-- Ekzekuto në Supabase → SQL Editor (ose via Supabase CLI)
-- ============================================================

-- 1. profiles – roli i përdoruesit (OWNER / WORKER)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER', 'WORKER')),
  updated_at timestamptz default now()
);

-- 2. suppliers – furnitorët (distributorët)
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- 3. products – barnat (+ opsional front)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  generic_name text,
  aliases text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  producer_name text,
  last_paid_price numeric(10,2),
  last_price_date date,
  default_order_qty integer default 1,
  category text default 'barna' check (category in ('barna', 'front')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. mungesat – mungesat e ditës (dedup + added_count)
create table if not exists public.mungesat (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  product_id uuid not null references public.products(id) on delete cascade,
  added_count integer not null default 1,
  urgent boolean not null default false,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(entry_date, product_id)
);

-- 5. orders – porositë sipas furnitorit (DRAFT → SENT)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SENT')),
  receipt_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. order_items – rreshtat e porosisë (final_qty nga pronari)
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  final_qty integer not null check (final_qty > 0),
  created_at timestamptz default now(),
  unique(order_id, product_id)
);

-- Indekset për kërkim dhe realtime
create index if not exists idx_mungesat_entry_date on public.mungesat(entry_date);
create index if not exists idx_mungesat_product on public.mungesat(product_id);
create index if not exists idx_orders_supplier_status on public.orders(supplier_id, status);
create index if not exists idx_products_name on public.products(name);
create index if not exists idx_products_category on public.products(category);

-- Trigger: profiles kur krijohet user i ri
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'WORKER');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== RLS (Row Level Security) ==========
-- Rregull: vetëm authenticated; pronari bën gjithçka; punëtori vetëm INSERT te mungesat.

alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.mungesat enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Helper: a është pronari?
create or replace function public.is_owner()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'OWNER'
  );
$$ language sql security definer stable;

-- profiles: vetëm authenticated lexojnë; pronari mund të ndryshojë (për role)
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_update_owner" on public.profiles for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- suppliers: të gjithë të kyçur lexojnë; vetëm pronari shkruan
create policy "suppliers_select" on public.suppliers for select to authenticated using (true);
create policy "suppliers_all_owner" on public.suppliers for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- products: të gjithë të kyçur lexojnë; vetëm pronari shkruan
create policy "products_select" on public.products for select to authenticated using (true);
create policy "products_all_owner" on public.products for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- mungesat: punëtori vetëm INSERT; pronari bën gjithçka
create policy "mungesat_select" on public.mungesat for select to authenticated using (true);
create policy "mungesat_insert" on public.mungesat for insert to authenticated with check (true);
create policy "mungesat_update_delete_owner" on public.mungesat for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- orders & order_items: vetëm pronari
create policy "orders_all_owner" on public.orders for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy "order_items_all_owner" on public.order_items for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- RPC: shtim mungese me dedup (punëtori thërret këtë në vend të INSERT të drejtpërdrejtë)
create or replace function public.add_mungese(
  p_product_id uuid,
  p_urgent boolean default false,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_existing_id uuid;
  v_new_id uuid;
begin
  select id into v_existing_id
  from mungesat
  where entry_date = v_today and product_id = p_product_id
  limit 1;

  if v_existing_id is not null then
    update mungesat
    set added_count = added_count + 1,
        urgent = urgent or p_urgent,
        note = coalesce(note, '') || case when p_note is not null and p_note <> '' then ' ' || p_note else '' end,
        updated_at = now()
    where id = v_existing_id;
    return v_existing_id;
  else
    insert into mungesat (entry_date, product_id, added_count, urgent, note, created_by)
    values (v_today, p_product_id, 1, p_urgent, p_note, auth.uid())
    returning id into v_new_id;
    return v_new_id;
  end if;
end;
$$;

-- Lejo të kyçur të thërrasin add_mungese (RLS në tabelë mungesat mbetet)
grant execute on function public.add_mungese(uuid, boolean, text) to authenticated;

-- Realtime: aktivizo për mungesat (sipas doc)
alter publication supabase_realtime add table public.mungesat;

-- Komente
comment on table public.profiles is 'Roli i përdoruesit: OWNER ose WORKER';
comment on table public.suppliers is 'Furnitorët (distributorët)';
comment on table public.products is 'Barnat + opsional front';
comment on table public.mungesat is 'Mungesat e ditës; dedup me added_count';
comment on table public.orders is 'Porositë sipas furnitorit; DRAFT/SENT + receipt_text';
comment on table public.order_items is 'Rreshtat e porosisë; final_qty nga pronari';
