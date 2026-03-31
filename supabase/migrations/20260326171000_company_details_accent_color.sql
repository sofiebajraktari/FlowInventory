alter table public.company_details
  add column if not exists accent_color text not null default '#0f172a';
