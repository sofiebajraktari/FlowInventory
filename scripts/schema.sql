
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER', 'WORKER')),
  updated_at timestamptz default now()
);


create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);


create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  generic_name text,
  aliases text[] default '{}'::text[],
  supplier_id uuid references public.suppliers(id) on delete set null,
  producer_name text,
  last_paid_price numeric(10,2),
  last_price_date date,
  default_order_qty integer default 1,
  category text default 'barna' check (category in ('barna', 'front')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SENT')),
  receipt_text text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sent_at timestamptz
);

alter table public.orders add column if not exists sent_at timestamptz;

-- 6. order_items – rreshtat e porosisë (final_qty nga pronari)
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  suggested_qty integer not null default 1 check (suggested_qty >= 1),
  final_qty integer not null check (final_qty > 0),
  note text not null default '',
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


alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.mungesat enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;


create or replace function public.is_owner()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'OWNER'
  );
$$ language sql security definer stable;-- profiles: lexim për të gjithë të kyçur; insert për veten (ose pronari); përditësim vetëm pronari
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_insert_self_or_owner" on public.profiles for insert to authenticated
  with check (auth.uid() = id or public.is_owner());
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

create policy "mungesat_select" on public.mungesat for select to authenticated using (true);
create policy "mungesat_insert" on public.mungesat for insert to authenticated
  with check (auth.uid() is not null and created_by = auth.uid());
create policy "mungesat_owner_update" on public.mungesat for update to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy "mungesat_owner_delete" on public.mungesat for delete to authenticated
  using (public.is_owner());
create policy "orders_all_owner" on public.orders for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy "order_items_all_owner" on public.order_items for all to authenticated
  using (public.is_owner()) with check (public.is_owner());


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


grant execute on function public.add_mungese(uuid, boolean, text) to authenticated;


create or replace function public.last_final_qty_by_product()
returns table (product_id uuid, final_qty integer)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (oi.product_id)
    oi.product_id,
    oi.final_qty::integer
  from public.order_items oi
  where oi.final_qty is not null and oi.final_qty >= 1
  order by oi.product_id, oi.created_at desc;
$$;

grant execute on function public.last_final_qty_by_product() to authenticated;


create or replace function public.mark_order_sent(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.orders
  set
    status = 'SENT',
    sent_at = now()
  where id = p_order_id;

  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.mark_order_sent(uuid) from public;
grant execute on function public.mark_order_sent(uuid) to authenticated;


alter publication supabase_realtime add table public.mungesat;

comment on table public.profiles is 'Roli i përdoruesit: OWNER ose WORKER';
comment on table public.suppliers is 'Furnitorët (distributorët)';
comment on table public.products is 'Barnat + opsional front';
comment on table public.mungesat is 'Mungesat e ditës; dedup me added_count';
comment on table public.orders is 'Porositë sipas furnitorit; DRAFT/SENT + receipt_text';
comment on table public.order_items is 'Rreshtat e porosisë; final_qty nga pronari';
