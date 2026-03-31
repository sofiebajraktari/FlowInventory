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
  shortages_since_created bigint
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p.id,
    coalesce(p.email, u.email::text) as email,
    coalesce(p.username, '') as username,
    p.role::text,
    p.is_active,
    u.created_at,
    u.last_sign_in_at,
    coalesce(
      sum(
        case
          when m.entry_date >= (u.created_at at time zone 'utc')::date then greatest(coalesce(m.added_count, 1), 1)
          else 0
        end
      ),
      0
    )::bigint as shortages_since_created
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.mungesat m
    on m.created_by = p.id
   and m.company_id = p.company_id
  where public.is_owner()
    and p.company_id = public.current_company_id()
    group by p.id, p.email, u.email, p.username, p.role, p.is_active, u.created_at, u.last_sign_in_at
  order by u.created_at desc;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;
