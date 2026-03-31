create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.admin_update_user_password(
  p_user_id uuid,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_company_id uuid;
  v_actor_role text;
  v_target_company_id uuid;
  v_password text := coalesce(p_password, '');
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

  if p_user_id is null then
    raise exception 'user_not_found' using errcode = '22023';
  end if;

  if char_length(v_password) < 6 then
    raise exception 'invalid_password' using errcode = '22023';
  end if;

  select p.company_id
    into v_target_company_id
  from public.profiles p
  where p.id = p_user_id
  limit 1;

  if v_target_company_id is null then
    raise exception 'user_not_found' using errcode = '22023';
  end if;

  if v_target_company_id <> v_actor_company_id then
    raise exception 'forbidden_other_company' using errcode = '42501';
  end if;

  update auth.users
  set
    encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf'::text)),
    confirmation_token = coalesce(confirmation_token, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    recovery_token = coalesce(recovery_token, ''),
    updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'auth_user_not_found' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.admin_update_user_password(uuid, text) from public;
grant execute on function public.admin_update_user_password(uuid, text) to authenticated;

comment on function public.admin_update_user_password(uuid, text) is
  'Allows OWNER users to update the password of a user in their own company.';

notify pgrst, 'reload schema';
