alter table public.products
  add column if not exists supplier_product_code text,
  add column if not exists unit_price numeric(10,2),
  add column if not exists lead_time_days integer,
  add column if not exists min_order_qty integer not null default 1,
  add column if not exists offer_priority integer not null default 100,
  add column if not exists is_active_offer boolean not null default true;

alter table public.products
  drop constraint if exists products_unit_price_nonnegative,
  add constraint products_unit_price_nonnegative check (unit_price is null or unit_price >= 0);

alter table public.products
  drop constraint if exists products_lead_time_nonnegative,
  add constraint products_lead_time_nonnegative check (lead_time_days is null or lead_time_days >= 0);

alter table public.products
  drop constraint if exists products_min_order_qty_positive,
  add constraint products_min_order_qty_positive check (min_order_qty >= 1);

alter table public.products
  drop constraint if exists products_offer_priority_nonnegative,
  add constraint products_offer_priority_nonnegative check (offer_priority >= 0);
