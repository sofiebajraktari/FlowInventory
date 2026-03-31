alter table public.mungesat
  add column if not exists created_by_role text check (created_by_role in ('OWNER', 'MANAGER', 'WORKER'));

update public.mungesat m
set created_by_role = p.role
from public.profiles p
where m.created_by is not null
  and m.created_by = p.id
  and m.created_by_role is null;

drop function if exists public.add_mungese(uuid, boolean, text);

create or replace function public.add_mungese(
  p_product_id uuid,
  p_urgent boolean default false,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_existing_id uuid;
  v_new_id uuid;
begin
  select id into v_existing_id
  from mungesat
  where entry_date = v_today and product_id = p_product_id
  limit 1;

  if v_existing_id is not null then
    update mungesat
    set added_count = added_count + 1,
        urgent = urgent or p_urgent,
        note = coalesce(note, '') || case when p_note is not null and p_note <> '' then ' ' || p_note else '' end,
        updated_at = now()
    where id = v_existing_id;
    return v_existing_id;
  else
    insert into mungesat (entry_date, product_id, added_count, urgent, note, created_by, created_by_role)
    values (
      v_today,
      p_product_id,
      1,
      p_urgent,
      p_note,
      auth.uid(),
      (
        select p.role
        from public.profiles p
        where p.id = auth.uid()
        limit 1
      )
    )
    returning id into v_new_id;
    return v_new_id;
  end if;
end;
$$;

revoke all on function public.add_mungese(uuid, boolean, text) from public;
grant execute on function public.add_mungese(uuid, boolean, text) to authenticated;
