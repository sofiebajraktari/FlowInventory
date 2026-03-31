create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

drop function if exists public.admin_create_user(text, text, text, text);

create or replace function public.admin_create_user(
  email text,
  p_password text,
  p_role text,
  p_username text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_company_id uuid;
  v_actor_role text;
  v_instance_id uuid;
  v_user_id uuid;
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_email text := lower(btrim(coalesce(email, '')));
  v_password text := coalesce(p_password, '');
  v_role text := upper(btrim(coalesce(p_role, 'WORKER')));
  v_existing_same_company uuid;
  v_existing_other_company uuid;
begin
  if v_actor_id is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select p.company_id, p.role::text
    into v_actor_company_id, v_actor_role
  from public.profiles p
  where p.id = v_actor_id
    and p.is_active = true
  limit 1;

  if v_actor_company_id is null then
    raise exception 'company_not_found' using errcode = '22023';
  end if;
  if coalesce(v_actor_role, '') <> 'OWNER' then
    raise exception 'forbidden_owner_only' using errcode = '42501';
  end if;

  if v_username !~ '^[a-z0-9._-]{3,32}$' then
    raise exception 'invalid_username' using errcode = '22023';
  end if;

  if char_length(v_password) < 6 then
    raise exception 'invalid_password' using errcode = '22023';
  end if;

  if v_role not in ('OWNER', 'MANAGER', 'WORKER') then
    v_role := 'WORKER';
  end if;

  if v_email = '' then
    v_email := v_username || '@flowinventory.local';
  end if;

  select p.id
    into v_existing_same_company
  from public.profiles p
  where p.company_id = v_actor_company_id
    and lower(coalesce(p.username, '')) = v_username
  limit 1;
  if v_existing_same_company is not null then
    return v_existing_same_company;
  end if;

  select p.id
    into v_existing_other_company
  from public.profiles p
  where p.company_id <> v_actor_company_id
    and lower(coalesce(p.username, '')) = v_username
  limit 1;
  if v_existing_other_company is not null then
    raise exception 'username_taken_other_company' using errcode = '23505';
  end if;

  select u.instance_id
    into v_instance_id
  from auth.users u
  where u.id = v_actor_id
  limit 1;
  if v_instance_id is null then
    v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  end if;

  v_user_id := gen_random_uuid();

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    v_instance_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(v_password, extensions.gen_salt('bf'::text)),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'username', v_username,
      'role', v_role,
      'company_id', v_actor_company_id::text,
      'email', v_email
    ),
    now(),
    now()
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email
    ),
    'email',
    v_email,
    now(),
    now(),
    now()
  )
  on conflict (provider, provider_id) do nothing;

  insert into public.profiles (
    id,
    company_id,
    role,
    username,
    email,
    is_active,
    updated_at
  )
  values (
    v_user_id,
    v_actor_company_id,
    v_role,
    v_username,
    v_email,
    true,
    now()
  )
  on conflict (id) do update
  set
    company_id = excluded.company_id,
    role = excluded.role,
    username = excluded.username,
    email = excluded.email,
    is_active = true,
    updated_at = now();

  return v_user_id;
end;
$$;

revoke all on function public.admin_create_user(text, text, text, text) from public;
grant execute on function public.admin_create_user(text, text, text, text) to authenticated;

drop function if exists public.admin_create_user(text, text, text);
create or replace function public.admin_create_user(
  p_username text,
  p_password text,
  p_role text
)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select public.admin_create_user(null::text, p_password, p_role, p_username);
$$;

revoke all on function public.admin_create_user(text, text, text) from public;
grant execute on function public.admin_create_user(text, text, text) to authenticated;

drop function if exists public.admin_create_user_v2(text, text, text, text);
create or replace function public.admin_create_user_v2(
  p_username text,
  p_password text,
  p_role text,
  p_email text default null
)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select public.admin_create_user(coalesce(p_email, null::text), p_password, p_role, p_username);
$$;

revoke all on function public.admin_create_user_v2(text, text, text, text) from public;
grant execute on function public.admin_create_user_v2(text, text, text, text) to authenticated;

create or replace function public.lookup_login_email(p_identifier text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.email
  from public.profiles p
  where p.is_active = true
    and p.email is not null
    and btrim(p.email) <> ''
    and (
      lower(p.email) = lower(p_identifier)
      or lower(coalesce(p.username, '')) = lower(p_identifier)
    )
  order by
    case when lower(p.email) = lower(p_identifier) then 0 else 1 end,
    p.updated_at desc nulls last,
    p.created_at desc nulls last
  limit 1;
$$;

revoke all on function public.lookup_login_email(text) from public;
grant execute on function public.lookup_login_email(text) to anon, authenticated;

notify pgrst, 'reload schema';
