alter table public.profiles add column if not exists is_active boolean not null default true;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  role text,
  is_active boolean,
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
    p.is_active,
    u.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_owner()
  order by u.created_at desc;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

comment on function public.admin_list_users() is
  'Vetëm OWNER: listë përdoruesish me email/rol/status për Settings.';
