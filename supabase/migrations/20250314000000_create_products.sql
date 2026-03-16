-- Tabela e parë për FlowInventory: produkte
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  quantity integer not null default 0,
  unit text default 'copë',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Lejojmë që aplikacioni (anon) të lexojë dhe të shkruajë (mund ta ndryshosh më vonë me RLS)
alter table public.products enable row level security;

create policy "Allow all for now"
  on public.products
  for all
  using (true)
  with check (true);

-- Koment për dokumentim
comment on table public.products is 'Produktet / inventari FlowInventory';
