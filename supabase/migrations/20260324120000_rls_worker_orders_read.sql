

drop policy if exists "orders_select_authenticated" on public.orders;
drop policy if exists "order_items_select_authenticated" on public.order_items;

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

comment on function public.last_final_qty_by_product() is
  'Lexim i kufizuar për UI punëtori: sasia finale e fundit për produkt, pa qasje të drejtpërdrejtë në order_items.';

grant execute on function public.last_final_qty_by_product() to authenticated;
