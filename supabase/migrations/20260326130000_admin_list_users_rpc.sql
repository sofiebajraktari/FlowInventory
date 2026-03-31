drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  role text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p.id,
    u.email::text,
    p.role::text,
    u.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_owner()
  order by u.created_at desc;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

comment on function public.admin_list_users() is
  'Vetëm OWNER: kthen listën e përdoruesve me email + rol për Settings.';
