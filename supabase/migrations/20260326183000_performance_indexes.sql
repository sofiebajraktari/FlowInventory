create index if not exists idx_mungesat_entry_date_product on public.mungesat(entry_date, product_id);
create index if not exists idx_orders_created_at_desc on public.orders(created_at desc);
create index if not exists idx_products_supplier_id on public.products(supplier_id);
create index if not exists idx_products_name_supplier on public.products(name, supplier_id);
