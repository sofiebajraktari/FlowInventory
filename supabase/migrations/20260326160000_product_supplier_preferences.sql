create table if not exists public.product_supplier_preferences (
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_name_norm text not null,
  preferred_product_id uuid not null references public.products(id) on delete cascade,
  preferred_supplier_id uuid references public.suppliers(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, product_name_norm)
);

create index if not exists idx_product_supplier_preferences_preferred_product
  on public.product_supplier_preferences(preferred_product_id);

alter table public.product_supplier_preferences enable row level security;

drop policy if exists "product_supplier_preferences_select" on public.product_supplier_preferences;
create policy "product_supplier_preferences_select"
  on public.product_supplier_preferences
  for select
  to authenticated
  using (owner_id = auth.uid() and public.is_owner());

drop policy if exists "product_supplier_preferences_insert" on public.product_supplier_preferences;
create policy "product_supplier_preferences_insert"
  on public.product_supplier_preferences
  for insert
  to authenticated
  with check (owner_id = auth.uid() and public.is_owner());

drop policy if exists "product_supplier_preferences_update" on public.product_supplier_preferences;
create policy "product_supplier_preferences_update"
  on public.product_supplier_preferences
  for update
  to authenticated
  using (owner_id = auth.uid() and public.is_owner())
  with check (owner_id = auth.uid() and public.is_owner());

drop policy if exists "product_supplier_preferences_delete" on public.product_supplier_preferences;
create policy "product_supplier_preferences_delete"
  on public.product_supplier_preferences
  for delete
  to authenticated
  using (owner_id = auth.uid() and public.is_owner());

comment on table public.product_supplier_preferences is
  'Preferencat e owner-it për furnitorin default sipas emrit të produktit.';
