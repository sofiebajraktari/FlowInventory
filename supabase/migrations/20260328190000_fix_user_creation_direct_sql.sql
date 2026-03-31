-- Fix user creation - use direct SQL instead of broken RPC
-- This migration creates a new, simpler RPC that directly inserts users

drop function if exists public.admin_create_user_v3(text, text, text, text);

create or replace function public.admin_create_user_v3(
  p_username text,
  p_password text,
  p_role text,
  p_email text default null
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
  v_user_id uuid;
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_password text := coalesce(p_password, '');
  v_role text := upper(btrim(coalesce(p_role, 'WORKER')));
begin
  -- Check auth
  if v_actor_id is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  -- Get actor's company and role
  select company_id, role::text
    into v_actor_company_id, v_actor_role
  from public.profiles
  where id = v_actor_id and is_active = true
  limit 1;

  if v_actor_company_id is null then
    raise exception 'company_not_found: you are not assigned to any company' using errcode = '22023';
  end if;

  if coalesce(v_actor_role, '') <> 'OWNER' then
    raise exception 'forbidden: only OWNER can create users' using errcode = '42501';
  end if;

  -- Validate username
  if v_username !~ '^[a-z0-9._-]{3,32}$' then
    raise exception 'invalid_username: must be 3-32 chars, lowercase a-z 0-9 . _ -' using errcode = '22023';
  end if;

  -- Validate password
  if char_length(v_password) < 6 then
    raise exception 'invalid_password: minimum 6 characters' using errcode = '22023';
  end if;

  -- Generate email if not provided
  if v_email = '' or v_email is null then
    v_email := v_username || '@flowinventory.local';
  end if;

  -- Check username not exists in same or other company
  if exists(select 1 from public.profiles where lower(username) = v_username) then
    raise exception 'username_exists: username already taken' using errcode = '23505';
  end if;

  -- Generate user ID
  v_user_id := gen_random_uuid();

  -- Insert into auth.users with proper bcrypt hash
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
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(v_password, extensions.gen_salt('bf')),
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

  -- Insert into auth.identities
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_email,
    now(),
    now(),
    now()
  )
  on conflict (provider, provider_id) do nothing;

  -- Insert into public.profiles
  insert into public.profiles (
    id,
    company_id,
    role,
    username,
    email,
    is_active,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_actor_company_id,
    v_role,
    v_username,
    v_email,
    true,
    now(),
    now()
  )
  on conflict (id) do update set
    company_id = excluded.company_id,
    role = excluded.role,
    username = excluded.username,
    email = excluded.email,
    is_active = true,
    updated_at = now();

  return v_user_id;
end;
$$;

revoke all on function public.admin_create_user_v3(text, text, text, text) from public;
grant execute on function public.admin_create_user_v3(text, text, text, text) to authenticated;

-- Create alias without email parameter for backward compatibility
drop function if exists public.admin_create_user_v3(text, text, text);

create or replace function public.admin_create_user_v3(
  p_username text,
  p_password text,
  p_role text
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.admin_create_user_v3(p_username, p_password, p_role, null::text);
$$;

revoke all on function public.admin_create_user_v3(text, text, text) from public;
grant execute on function public.admin_create_user_v3(text, text, text) to authenticated;
