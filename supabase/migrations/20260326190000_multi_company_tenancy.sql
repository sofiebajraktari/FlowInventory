create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists company_id uuid references public.companies(id) on delete set null;

do $$
declare
  v_default_company uuid;
begin
  select id into v_default_company from public.companies order by created_at asc limit 1;
  if v_default_company is null then
    insert into public.companies (name, code)
    values ('Default Company', 'default')
    returning id into v_default_company;
  end if;
  update public.profiles
  set company_id = v_default_company
  where company_id is null;
end
$$;

alter table public.profiles
  alter column company_id set not null;

alter table public.suppliers add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.products add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.mungesat add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.orders add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.order_items add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.product_supplier_preferences add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.company_details add column if not exists company_id uuid references public.companies(id) on delete cascade;

do $$
declare
  v_default_company uuid;
begin
  select company_id into v_default_company from public.profiles order by updated_at asc limit 1;
  if v_default_company is null then
    select id into v_default_company from public.companies order by created_at asc limit 1;
  end if;

  update public.suppliers set company_id = v_default_company where company_id is null;

  update public.products p
  set company_id = s.company_id
  from public.suppliers s
  where p.company_id is null and p.supplier_id = s.id;
  update public.products set company_id = v_default_company where company_id is null;

  update public.mungesat m
  set company_id = p.company_id
  from public.products p
  where m.company_id is null and m.product_id = p.id;
  update public.mungesat m
  set company_id = pr.company_id
  from public.profiles pr
  where m.company_id is null and m.created_by = pr.id;
  update public.mungesat set company_id = v_default_company where company_id is null;

  update public.orders o
  set company_id = s.company_id
  from public.suppliers s
  where o.company_id is null and o.supplier_id = s.id;
  update public.orders o
  set company_id = pr.company_id
  from public.profiles pr
  where o.company_id is null and o.created_by = pr.id;
  update public.orders set company_id = v_default_company where company_id is null;

  update public.order_items oi
  set company_id = o.company_id
  from public.orders o
  where oi.company_id is null and oi.order_id = o.id;
  update public.order_items set company_id = v_default_company where company_id is null;

  update public.product_supplier_preferences psp
  set company_id = pr.company_id
  from public.profiles pr
  where psp.company_id is null and psp.owner_id = pr.id;
  update public.product_supplier_preferences set company_id = v_default_company where company_id is null;

  update public.company_details cd
  set company_id = pr.company_id
  from public.profiles pr
  where cd.company_id is null and cd.owner_id = pr.id;
  update public.company_details set company_id = v_default_company where company_id is null;
end
$$;

alter table public.suppliers alter column company_id set not null;
alter table public.products alter column company_id set not null;
alter table public.mungesat alter column company_id set not null;
alter table public.orders alter column company_id set not null;
alter table public.order_items alter column company_id set not null;
alter table public.product_supplier_preferences alter column company_id set not null;
alter table public.company_details alter column company_id set not null;

alter table public.suppliers drop constraint if exists suppliers_name_key;
create unique index if not exists suppliers_company_name_unique_idx
  on public.suppliers (company_id, lower(name));

alter table public.mungesat drop constraint if exists mungesat_entry_date_product_id_key;
alter table public.mungesat drop constraint if exists mungesat_company_entry_product_unique;
alter table public.mungesat add constraint mungesat_company_entry_product_unique unique (company_id, entry_date, product_id);

alter table public.company_details drop constraint if exists company_details_pkey;
alter table public.company_details alter column owner_id drop not null;
alter table public.company_details add constraint company_details_pkey primary key (company_id);
create unique index if not exists company_details_owner_unique_idx on public.company_details(owner_id) where owner_id is not null;

alter table public.product_supplier_preferences drop constraint if exists product_supplier_preferences_pkey;
alter table public.product_supplier_preferences add constraint product_supplier_preferences_pkey primary key (company_id, product_name_norm);

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.company_id
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1;
$$;

create or replace function public.is_owner()
returns boolean as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('OWNER', 'MANAGER')
  );
$$ language sql security definer stable;

alter table public.suppliers alter column company_id set default public.current_company_id();
alter table public.products alter column company_id set default public.current_company_id();
alter table public.mungesat alter column company_id set default public.current_company_id();
alter table public.orders alter column company_id set default public.current_company_id();
alter table public.order_items alter column company_id set default public.current_company_id();
alter table public.product_supplier_preferences alter column company_id set default public.current_company_id();
alter table public.company_details alter column company_id set default public.current_company_id();

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert_self_or_owner" on public.profiles;
drop policy if exists "profiles_update_owner" on public.profiles;
drop policy if exists "suppliers_select" on public.suppliers;
drop policy if exists "suppliers_all_owner" on public.suppliers;
drop policy if exists "products_select" on public.products;
drop policy if exists "products_all_owner" on public.products;
drop policy if exists "mungesat_select" on public.mungesat;
drop policy if exists "mungesat_insert" on public.mungesat;
drop policy if exists "mungesat_owner_update" on public.mungesat;
drop policy if exists "mungesat_owner_delete" on public.mungesat;
drop policy if exists "orders_all_owner" on public.orders;
drop policy if exists "order_items_all_owner" on public.order_items;
drop policy if exists "product_supplier_preferences_select" on public.product_supplier_preferences;
drop policy if exists "product_supplier_preferences_insert" on public.product_supplier_preferences;
drop policy if exists "product_supplier_preferences_update" on public.product_supplier_preferences;
drop policy if exists "product_supplier_preferences_delete" on public.product_supplier_preferences;
drop policy if exists "company_details_select" on public.company_details;
drop policy if exists "company_details_insert" on public.company_details;
drop policy if exists "company_details_update" on public.company_details;
drop policy if exists "company_details_delete" on public.company_details;

create policy "profiles_select" on public.profiles for select to authenticated
  using (company_id = public.current_company_id());
create policy "profiles_insert_owner_same_company" on public.profiles for insert to authenticated
  with check (public.is_owner() and company_id = public.current_company_id());
create policy "profiles_update_owner_same_company" on public.profiles for update to authenticated
  using (public.is_owner() and company_id = public.current_company_id())
  with check (public.is_owner() and company_id = public.current_company_id());

create policy "suppliers_select_company" on public.suppliers for select to authenticated
  using (company_id = public.current_company_id());
create policy "suppliers_write_owner_company" on public.suppliers for all to authenticated
  using (public.is_owner() and company_id = public.current_company_id())
  with check (public.is_owner() and company_id = public.current_company_id());

create policy "products_select_company" on public.products for select to authenticated
  using (company_id = public.current_company_id());
create policy "products_write_owner_company" on public.products for all to authenticated
  using (public.is_owner() and company_id = public.current_company_id())
  with check (public.is_owner() and company_id = public.current_company_id());

create policy "mungesat_select_company" on public.mungesat for select to authenticated
  using (company_id = public.current_company_id());
create policy "mungesat_insert_company" on public.mungesat for insert to authenticated
  with check (company_id = public.current_company_id() and auth.uid() is not null and created_by = auth.uid());
create policy "mungesat_update_owner_company" on public.mungesat for update to authenticated
  using (public.is_owner() and company_id = public.current_company_id())
  with check (public.is_owner() and company_id = public.current_company_id());
create policy "mungesat_delete_owner_company" on public.mungesat for delete to authenticated
  using (public.is_owner() and company_id = public.current_company_id());

create policy "orders_all_owner_company" on public.orders for all to authenticated
  using (public.is_owner() and company_id = public.current_company_id())
  with check (public.is_owner() and company_id = public.current_company_id());
create policy "order_items_all_owner_company" on public.order_items for all to authenticated
  using (public.is_owner() and company_id = public.current_company_id())
  with check (public.is_owner() and company_id = public.current_company_id());

create policy "product_supplier_preferences_select_company" on public.product_supplier_preferences for select to authenticated
  using (company_id = public.current_company_id() and public.is_owner());
create policy "product_supplier_preferences_insert_company" on public.product_supplier_preferences for insert to authenticated
  with check (company_id = public.current_company_id() and public.is_owner());
create policy "product_supplier_preferences_update_company" on public.product_supplier_preferences for update to authenticated
  using (company_id = public.current_company_id() and public.is_owner())
  with check (company_id = public.current_company_id() and public.is_owner());
create policy "product_supplier_preferences_delete_company" on public.product_supplier_preferences for delete to authenticated
  using (company_id = public.current_company_id() and public.is_owner());

create policy "company_details_select_company" on public.company_details for select to authenticated
  using (company_id = public.current_company_id() and public.is_owner());
create policy "company_details_insert_company" on public.company_details for insert to authenticated
  with check (company_id = public.current_company_id() and public.is_owner());
create policy "company_details_update_company" on public.company_details for update to authenticated
  using (company_id = public.current_company_id() and public.is_owner())
  with check (company_id = public.current_company_id() and public.is_owner());
create policy "company_details_delete_company" on public.company_details for delete to authenticated
  using (company_id = public.current_company_id() and public.is_owner());

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
  v_company_id uuid := public.current_company_id();
  v_existing_id uuid;
  v_new_id uuid;
begin
  if v_company_id is null then
    raise exception 'company_not_found' using errcode = '22023';
  end if;

  select id into v_existing_id
  from mungesat
  where company_id = v_company_id
    and entry_date = v_today
    and product_id = p_product_id
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
    insert into mungesat (company_id, entry_date, product_id, added_count, urgent, note, created_by, created_by_role)
    values (
      v_company_id,
      v_today,
      p_product_id,
      1,
      p_urgent,
      p_note,
      auth.uid(),
      (
        select p.role
        from public.profiles p
        where p.id = auth.uid()
        limit 1
      )
    )
    returning id into v_new_id;
    return v_new_id;
  end if;
end;
$$;

drop function if exists public.admin_list_users();
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  username text,
  role text,
  is_active boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p.id,
    coalesce(p.email, u.email::text) as email,
    coalesce(p.username, '') as username,
    p.role::text,
    p.is_active,
    u.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_owner()
    and p.company_id = public.current_company_id()
  order by u.created_at desc;
$$;

drop function if exists public.admin_delete_user(uuid);
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  n int;
  v_company_id uuid;
begin
  select p.company_id into v_company_id
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'OWNER'
    and p.is_active = true
  limit 1;
  if v_company_id is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'invalid_user_id' using errcode = '22023';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'cannot_delete_self' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.company_id = v_company_id
  ) then
    raise exception 'forbidden_cross_company' using errcode = '42501';
  end if;

  delete from auth.users where id = p_user_id;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_company_id uuid;
begin
  begin
    v_company_id := nullif(new.raw_user_meta_data->>'company_id', '')::uuid;
  exception when others then
    v_company_id := null;
  end;
  if v_company_id is null then
    select id into v_company_id from public.companies order by created_at asc limit 1;
  end if;

  insert into public.profiles (id, role, username, email, is_active, company_id)
  values (
    new.id,
    'WORKER',
    nullif(lower(coalesce(new.raw_user_meta_data->>'username', '')), ''),
    new.email,
    true,
    v_company_id
  );
  return new;
end;
$$ language plpgsql security definer;
