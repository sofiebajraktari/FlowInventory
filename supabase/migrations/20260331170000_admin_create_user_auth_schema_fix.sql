create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Supabase Auth password login can fail with:
-- "Database error querying schema"
-- when these token columns are NULL on users inserted manually via SQL.
update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  recovery_token = coalesce(recovery_token, ''),
  updated_at = now()
where confirmation_token is null
   or email_change is null
   or email_change_token_new is null
   or recovery_token is null;

create or replace function public.admin_create_user(
  email text,
  p_password text,
  p_role text,
  p_username text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
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

  if char_length(v_password) < 6 then
    raise exception 'invalid_password' using errcode = '22023';
  end if;

  if v_role not in ('OWNER', 'MANAGER', 'WORKER') then
    v_role := 'WORKER';
  end if;

  if v_email = '' then
    if v_username = '' then
      raise exception 'invalid_email' using errcode = '22023';
    end if;
    v_email := v_username || '@flowinventory.local';
  end if;

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  if v_username = '' then
    v_username := split_part(v_email, '@', 1);
  end if;

  v_username := regexp_replace(v_username, '[^a-z0-9._-]+', '.', 'g');
  v_username := regexp_replace(v_username, '[._-]{2,}', '.', 'g');
  v_username := regexp_replace(v_username, '^[._-]+|[._-]+$', '', 'g');

  if char_length(v_username) < 3 then
    v_username := rpad(v_username || 'usr', 3, 'x');
  end if;
  if char_length(v_username) > 32 then
    v_username := left(v_username, 32);
  end if;

  if v_username !~ '^[a-z0-9._-]{3,32}$' then
    raise exception 'invalid_username' using errcode = '22023';
  end if;

  select u.instance_id
    into v_instance_id
  from auth.users u
  where u.id = v_actor_id
  limit 1;

  if v_instance_id is null then
    select i.id
      into v_instance_id
    from auth.instances i
    limit 1;
  end if;

  if v_instance_id is null then
    v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  end if;

  select p.id
    into v_existing_same_company
  from public.profiles p
  where p.company_id = v_actor_company_id
    and (
      lower(coalesce(p.email, '')) = v_email
      or lower(coalesce(p.username, '')) = v_username
    )
  order by case when lower(coalesce(p.email, '')) = v_email then 0 else 1 end
  limit 1;

  if v_existing_same_company is not null then
    v_user_id := v_existing_same_company;
  else
    select p.id
      into v_existing_other_company
    from public.profiles p
    where p.company_id <> v_actor_company_id
      and (
        lower(coalesce(p.email, '')) = v_email
        or lower(coalesce(p.username, '')) = v_username
      )
    limit 1;

    if v_existing_other_company is not null then
      raise exception 'email_or_username_taken_other_company' using errcode = '23505';
    end if;

    v_user_id := gen_random_uuid();
  end if;

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
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
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'username', v_username,
      'role', v_role,
      'company_id', v_actor_company_id::text,
      'email', v_email
    ),
    now(),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
    confirmation_token = coalesce(auth.users.confirmation_token, ''),
    email_change = coalesce(auth.users.email_change, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''),
    recovery_token = coalesce(auth.users.recovery_token, ''),
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = coalesce(auth.users.raw_user_meta_data, '{}'::jsonb) || excluded.raw_user_meta_data,
    updated_at = now();

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

  delete from auth.identities ai
  where ai.provider = 'email'
    and (
      ai.user_id = v_user_id
      or lower(coalesce(ai.provider_id, '')) = v_email
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
  );

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

drop function if exists public.admin_create_user_v3(text, text, text, text);
create or replace function public.admin_create_user_v3(
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

revoke all on function public.admin_create_user_v3(text, text, text, text) from public;
grant execute on function public.admin_create_user_v3(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
