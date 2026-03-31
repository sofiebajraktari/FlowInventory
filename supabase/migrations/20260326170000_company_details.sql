create table if not exists public.company_details (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_details_name on public.company_details(name);

alter table public.company_details enable row level security;

drop policy if exists "company_details_select" on public.company_details;
drop policy if exists "company_details_insert" on public.company_details;
drop policy if exists "company_details_update" on public.company_details;
drop policy if exists "company_details_delete" on public.company_details;

create policy "company_details_select" on public.company_details for select to authenticated
  using (owner_id = auth.uid() and public.is_owner());

create policy "company_details_insert" on public.company_details for insert to authenticated
  with check (owner_id = auth.uid() and public.is_owner());

create policy "company_details_update" on public.company_details for update to authenticated
  using (owner_id = auth.uid() and public.is_owner()) with check (owner_id = auth.uid() and public.is_owner());

create policy "company_details_delete" on public.company_details for delete to authenticated
  using (owner_id = auth.uid() and public.is_owner());
