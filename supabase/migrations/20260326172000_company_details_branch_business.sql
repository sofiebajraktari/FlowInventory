alter table public.company_details
  add column if not exists branch_name text not null default '',
  add column if not exists business_number text not null default '';
