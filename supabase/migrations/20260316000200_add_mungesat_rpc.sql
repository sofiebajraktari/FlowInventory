-- RPC helper për dedup te mungesat (worker safe insert)
create or replace function public.add_mungese(
  p_product_id uuid,
  p_urgent boolean default false,
  p_note text default ''
)
returns public.mungesat
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.mungesat;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.mungesat (
    product_id,
    entry_date,
    urgent,
    note,
    added_count,
    created_by
  )
  values (
    p_product_id,
    current_date,
    coalesce(p_urgent, false),
    coalesce(p_note, ''),
    1,
    auth.uid()
  )
  on conflict (entry_date, product_id)
  do update
    set added_count = public.mungesat.added_count + 1,
        urgent = public.mungesat.urgent or excluded.urgent,
        note = case
          when coalesce(excluded.note, '') = '' then public.mungesat.note
          when coalesce(public.mungesat.note, '') = '' then excluded.note
          else public.mungesat.note || ' | ' || excluded.note
        end,
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.add_mungese(uuid, boolean, text) to authenticated;
