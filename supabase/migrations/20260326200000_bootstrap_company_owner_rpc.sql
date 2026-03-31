create or replace function public.bootstrap_company_owner(
  p_company_name text,
  p_company_code text,
  p_username text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_name text := btrim(coalesce(p_company_name, ''));
  v_company_code text := lower(regexp_replace(btrim(coalesce(p_company_code, '')), '[^a-z0-9_-]+', '-', 'g'));
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_company_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if v_company_name = '' then
    raise exception 'company_name_required' using errcode = '22023';
  end if;
  if v_company_code = '' then
    raise exception 'company_code_required' using errcode = '22023';
  end if;
  if v_username !~ '^[a-z0-9._-]{3,32}$' then
    raise exception 'invalid_username' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.companies c
    where lower(c.code) = v_company_code
  ) then
    raise exception 'company_code_taken' using errcode = '23505';
  end if;

  insert into public.companies (name, code)
  values (v_company_name, v_company_code)
  returning id into v_company_id;

  update public.profiles p
  set
    company_id = v_company_id,
    role = 'OWNER',
    username = v_username,
    is_active = true,
    updated_at = now()
  where p.id = v_user_id;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  insert into public.company_details (company_id, name, pos_name, email, updated_at)
  values (
    v_company_id,
    v_company_name,
    v_company_name,
    coalesce((select p.email from public.profiles p where p.id = v_user_id), ''),
    now()
  )
  on conflict (company_id) do update
  set
    name = excluded.name,
    pos_name = excluded.pos_name,
    email = excluded.email,
    updated_at = now();

  return v_company_id;
end;
$$;

revoke all on function public.bootstrap_company_owner(text, text, text) from public;
grant execute on function public.bootstrap_company_owner(text, text, text) to authenticated;
