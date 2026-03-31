create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  n int;
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'OWNER'
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'invalid_user_id' using errcode = '22023';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'cannot_delete_self' using errcode = '22023';
  end if;

  delete from auth.users where id = p_user_id;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;

comment on function public.admin_delete_user(uuid) is
  'OWNER only: fshin përdoruesin nga auth.users (cascade profiles).';
