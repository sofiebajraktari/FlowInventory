-- Fix RLS policies to enforce multi-tenancy
-- Policies should filter by company_id, not allow all authenticated users

-- Suppliers: Fix SELECT policy
drop policy if exists "suppliers_select_authenticated" on public.suppliers;
create policy "suppliers_select_authenticated"
  on public.suppliers for select
  to authenticated
  using (company_id = public.current_company_id());

-- Products: Fix SELECT policy
drop policy if exists "products_select_authenticated" on public.products;
create policy "products_select_authenticated"
  on public.products for select
  to authenticated
  using (company_id = public.current_company_id());

-- Mungesat: Fix SELECT policy
drop policy if exists "mungesat_select_authenticated" on public.mungesat;
create policy "mungesat_select_authenticated"
  on public.mungesat for select
  to authenticated
  using (company_id = public.current_company_id());

-- Orders: Fix SELECT policy
drop policy if exists "orders_select_authenticated" on public.orders;
create policy "orders_select_authenticated"
  on public.orders for select
  to authenticated
  using (company_id = public.current_company_id());

-- Order Items: Fix SELECT policy
drop policy if exists "order_items_select_authenticated" on public.order_items;
create policy "order_items_select_authenticated"
  on public.order_items for select
  to authenticated
  using (company_id = public.current_company_id());

-- Profiles: Keep profiles more flexible but can be restricted
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (company_id = public.current_company_id());

-- UPDATE policies: Add company_id check where missing

-- Suppliers: UPDATE/INSERT should maintain company_id
drop policy if exists "suppliers_owner_insert" on public.suppliers;
create policy "suppliers_owner_insert"
  on public.suppliers for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

drop policy if exists "suppliers_owner_update" on public.suppliers;
create policy "suppliers_owner_update"
  on public.suppliers for update
  to authenticated
  with check (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

drop policy if exists "suppliers_owner_delete" on public.suppliers;
create policy "suppliers_owner_delete"
  on public.suppliers for delete
  to authenticated
  using (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

-- Products: UPDATE/INSERT should maintain company_id
drop policy if exists "products_owner_insert" on public.products;
create policy "products_owner_insert"
  on public.products for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

drop policy if exists "products_owner_update" on public.products;
create policy "products_owner_update"
  on public.products for update
  to authenticated
  with check (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

drop policy if exists "products_owner_delete" on public.products;
create policy "products_owner_delete"
  on public.products for delete
  to authenticated
  using (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

-- Mungesat: UPDATE/INSERT should maintain company_id
drop policy if exists "mungesat_insert_authenticated" on public.mungesat;
create policy "mungesat_insert_authenticated"
  on public.mungesat for insert
  to authenticated
  with check (company_id = public.current_company_id());

drop policy if exists "mungesat_update_authenticated" on public.mungesat;
create policy "mungesat_update_authenticated"
  on public.mungesat for update
  to authenticated
  with check (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role in ('OWNER', 'MANAGER'))
  );

drop policy if exists "mungesat_delete_authenticated" on public.mungesat;
create policy "mungesat_delete_authenticated"
  on public.mungesat for delete
  to authenticated
  using (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role in ('OWNER', 'MANAGER'))
  );

-- Orders: UPDATE/INSERT should maintain company_id
drop policy if exists "orders_owner_insert" on public.orders;
create policy "orders_owner_insert"
  on public.orders for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

drop policy if exists "orders_owner_update" on public.orders;
create policy "orders_owner_update"
  on public.orders for update
  to authenticated
  with check (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

drop policy if exists "orders_owner_delete" on public.orders;
create policy "orders_owner_delete"
  on public.orders for delete
  to authenticated
  using (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

-- Order Items: UPDATE/INSERT should maintain company_id
drop policy if exists "order_items_owner_insert" on public.order_items;
create policy "order_items_owner_insert"
  on public.order_items for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

drop policy if exists "order_items_owner_update" on public.order_items;
create policy "order_items_owner_update"
  on public.order_items for update
  to authenticated
  with check (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

drop policy if exists "order_items_owner_delete" on public.order_items;
create policy "order_items_owner_delete"
  on public.order_items for delete
  to authenticated
  using (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

-- Profiles: Only see your own profile or company members
drop policy if exists "profiles_insert_self_or_owner" on public.profiles;
create policy "profiles_insert_self_or_owner"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid() and company_id = public.current_company_id());

drop policy if exists "profiles_update_owner_only" on public.profiles;
create policy "profiles_update_owner_only"
  on public.profiles for update
  to authenticated
  using (company_id = public.current_company_id())
  with check (
    id = auth.uid()
    or auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

drop policy if exists "profiles_delete_owner_only" on public.profiles;
create policy "profiles_delete_owner_only"
  on public.profiles for delete
  to authenticated
  using (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

-- Ensure company_details are isolated
alter table public.company_details enable row level security;

drop policy if exists "company_details_select" on public.company_details;
create policy "company_details_select"
  on public.company_details for select
  to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "company_details_insert" on public.company_details;
create policy "company_details_insert"
  on public.company_details for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

drop policy if exists "company_details_update" on public.company_details;
create policy "company_details_update"
  on public.company_details for update
  to authenticated
  with check (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

drop policy if exists "company_details_delete" on public.company_details;
create policy "company_details_delete"
  on public.company_details for delete
  to authenticated
  using (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

-- Ensure product_supplier_preferences are isolated
alter table public.product_supplier_preferences enable row level security;

drop policy if exists "product_supplier_preferences_select" on public.product_supplier_preferences;
create policy "product_supplier_preferences_select"
  on public.product_supplier_preferences for select
  to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "product_supplier_preferences_insert" on public.product_supplier_preferences;
create policy "product_supplier_preferences_insert"
  on public.product_supplier_preferences for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

drop policy if exists "product_supplier_preferences_update" on public.product_supplier_preferences;
create policy "product_supplier_preferences_update"
  on public.product_supplier_preferences for update
  to authenticated
  with check (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );

drop policy if exists "product_supplier_preferences_delete" on public.product_supplier_preferences;
create policy "product_supplier_preferences_delete"
  on public.product_supplier_preferences for delete
  to authenticated
  using (
    company_id = public.current_company_id()
    and auth.uid() in (select id from public.profiles where company_id = public.current_company_id() and role = 'OWNER')
  );
