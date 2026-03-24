alter table public.orders add column if not exists sent_at timestamptz;

create or replace function public.mark_order_sent(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.orders
  set
    status = 'SENT',
    sent_at = now()
  where id = p_order_id;

  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.mark_order_sent(uuid) from public;
grant execute on function public.mark_order_sent(uuid) to authenticated;

comment on function public.mark_order_sent(uuid) is
  'Pronari shënon porosinë si SENT; anashkalon probleme RLS/RETURNING te klienti.';
