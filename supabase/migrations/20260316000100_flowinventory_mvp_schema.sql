-- FlowInventory MVP schema + RLS
-- Përputhur me udhëzuesin e projektit (OWNER/WORKER, mungesat, porositë, importi).

create extension if not exists pgcrypto;

-- ===== 1) PROFILES (role per user) =====
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER', 'WORKER')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== 2) SUPPLIERS =====
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== 3) PRODUCTS =====
-- Tabela ekziston nga migrimi i parë; shtojmë fushat e MVP pa prishur kolonat ekzistuese.
alter table public.products
  add column if not exists supplier_id uuid references public.suppliers(id),
  add column if not exists generic_name text,
  add column if not exists aliases text[] default '{}'::text[],
  add column if not exists category text not null default 'barna' check (category in ('barna', 'front')),
  add column if not exists default_order_qty integer not null default 1,
  add column if not exists producer_name text,
  add column if not exists last_paid_price numeric(10,2),
  add column if not exists last_price_date date;

-- ===== 4) MUNGESAT =====
create table if not exists public.mungesat (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  entry_date date not null default current_date,
  urgent boolean not null default false,
  note text not null default '',
  added_count integer not null default 1 check (added_count >= 1),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entry_date, product_id)
);

-- ===== 5) ORDERS =====
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SENT')),
  receipt_text text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- ===== 6) ORDER ITEMS =====
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  suggested_qty integer not null default 1 check (suggested_qty >= 1),
  final_qty integer not null default 1 check (final_qty >= 1),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_products_supplier on public.products(supplier_id);
create index if not exists idx_mungesat_entry_date on public.mungesat(entry_date);
create index if not exists idx_mungesat_created_by on public.mungesat(created_by);
create index if not exists idx_orders_supplier on public.orders(supplier_id);
create index if not exists idx_order_items_order on public.order_items(order_id);

comment on table public.profiles is 'Roli i përdoruesit: OWNER / WORKER';
comment on table public.suppliers is 'Furnitorët e farmacisë';
comment on table public.products is 'Produktet (barna/front) për mungesa dhe porosi';
comment on table public.mungesat is 'Mungesat ditore (DEDUP me entry_date + product_id)';
comment on table public.orders is 'Porosi sipas furnitorit (DRAFT/SENT)';
comment on table public.order_items is 'Rreshtat e porosisë me suggested_qty/final_qty';

-- ===== 7) RLS helper =====
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'OWNER'
  );
$$;

-- ===== 8) Enable RLS =====
alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.mungesat enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Pastrim i policy së vjetër shumë permisive te products
drop policy if exists "Allow all for now" on public.products;

-- ===== 9) Policies =====
-- Lexim: vetëm authenticated users
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "suppliers_select_authenticated"
  on public.suppliers for select
  to authenticated
  using (true);

create policy "products_select_authenticated"
  on public.products for select
  to authenticated
  using (true);

create policy "mungesat_select_authenticated"
  on public.mungesat for select
  to authenticated
  using (true);

create policy "orders_select_authenticated"
  on public.orders for select
  to authenticated
  using (true);

create policy "order_items_select_authenticated"
  on public.order_items for select
  to authenticated
  using (true);

-- Profiles: user krijon profilin e vet, owner mund të menaxhojë
create policy "profiles_insert_self_or_owner"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id or public.is_owner());

create policy "profiles_update_owner_only"
  on public.profiles for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- Suppliers / Products: owner writes
create policy "suppliers_owner_write"
  on public.suppliers for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "products_owner_write"
  on public.products for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- Mungesat: worker+owner INSERT, owner UPDATE/DELETE
create policy "mungesat_insert_authenticated"
  on public.mungesat for insert
  to authenticated
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "mungesat_owner_update"
  on public.mungesat for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "mungesat_owner_delete"
  on public.mungesat for delete
  to authenticated
  using (public.is_owner());

-- Orders / Order items: owner writes
create policy "orders_owner_write"
  on public.orders for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "order_items_owner_write"
  on public.order_items for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());
