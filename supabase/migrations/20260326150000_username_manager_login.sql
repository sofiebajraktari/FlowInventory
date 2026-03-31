alter table public.profiles
  add column if not exists username text,
  add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and (p.email is null or btrim(p.email) = '');

create unique index if not exists profiles_username_unique_idx
  on public.profiles ((lower(username)))
  where username is not null and btrim(username) <> '';

create unique index if not exists profiles_email_unique_idx
  on public.profiles ((lower(email)))
  where email is not null and btrim(email) <> '';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('OWNER', 'MANAGER', 'WORKER'));

create or replace function public.is_owner()
returns boolean as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('OWNER', 'MANAGER')
  );
$$ language sql security definer stable;

drop function if exists public.admin_list_users();
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  username text,
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
    coalesce(p.email, u.email::text) as email,
    coalesce(p.username, '') as username,
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
    and (
      lower(p.email) = lower(p_identifier)
      or lower(coalesce(p.username, '')) = lower(p_identifier)
    )
  order by case when lower(p.email) = lower(p_identifier) then 0 else 1 end
  limit 1;
$$;

revoke all on function public.lookup_login_email(text) from public;
grant execute on function public.lookup_login_email(text) to anon, authenticated;

comment on function public.lookup_login_email(text) is
  'Kthen email për login me username ose email.';
