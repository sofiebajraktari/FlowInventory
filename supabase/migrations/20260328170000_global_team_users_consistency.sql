-- Global consistency fix for all companies:
-- 1) Backfill profile email/company_id from auth.users metadata where possible.
-- 2) Ensure username uniqueness per company.
-- 3) Rebuild admin_list_users with stable tenant filtering + activity metrics.

update public.profiles p
set email = u.email,
    updated_at = now()
from auth.users u
where u.id = p.id
  and u.email is not null
  and btrim(u.email) <> ''
  and (p.email is null or btrim(p.email) = '');

update public.profiles p
set company_id = (u.raw_user_meta_data->>'company_id')::uuid,
    updated_at = now()
from auth.users u
where u.id = p.id
  and coalesce(u.raw_user_meta_data->>'company_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (
    p.company_id is null
    or p.company_id is distinct from (u.raw_user_meta_data->>'company_id')::uuid
  );

create unique index if not exists profiles_company_username_unique_idx
  on public.profiles (company_id, lower(username))
  where username is not null and btrim(username) <> '';

drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  username text,
  role text,
  is_active boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  shortages_since_created bigint,
  last_shortage_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  with me as (
    select public.current_company_id() as company_id
  )
  select
    p.id,
    coalesce(p.email, u.email::text) as email,
    coalesce(p.username, '') as username,
    p.role::text,
    p.is_active,
    coalesce(u.created_at, p.created_at) as created_at,
    u.last_sign_in_at,
    coalesce(sum(greatest(coalesce(m.added_count, 1), 1)), 0)::bigint as shortages_since_created,
    max(m.created_at) as last_shortage_at
  from me
  join public.profiles p
    on p.company_id = me.company_id
  left join auth.users u
    on u.id = p.id
  left join public.mungesat m
    on m.created_by = p.id
   and m.company_id = p.company_id
  where public.is_owner()
  group by p.id, p.email, u.email, p.username, p.role, p.is_active, u.created_at, p.created_at, u.last_sign_in_at
  order by coalesce(u.created_at, p.created_at) desc nulls last;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

notify pgrst, 'reload schema';
