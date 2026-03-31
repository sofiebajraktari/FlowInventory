alter table public.profiles
  add column if not exists active_session_id uuid;

create index if not exists idx_profiles_active_session_id
  on public.profiles(active_session_id)
  where active_session_id is not null;

create or replace function public.normalize_profile_active_session()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.is_active, true) = false then
    new.active_session_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_normalize_active_session on public.profiles;
create trigger trg_profiles_normalize_active_session
  before insert or update of is_active, active_session_id
  on public.profiles
  for each row
  execute function public.normalize_profile_active_session();

create or replace function public.get_my_session_state()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'is_active', coalesce(p.is_active, true),
    'active_session_id', p.active_session_id,
    'username', coalesce(p.username, '')
  )
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_my_session_state() from public;
grant execute on function public.get_my_session_state() to authenticated;

create or replace function public.claim_active_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_active boolean;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  if p_session_id is null then
    raise exception 'invalid_session_id' using errcode = '22023';
  end if;

  select coalesce(p.is_active, true)
    into v_is_active
  from public.profiles p
  where p.id = auth.uid()
  limit 1;

  if v_is_active is null then
    raise exception 'profile_not_found' using errcode = '22023';
  end if;

  if v_is_active = false then
    raise exception 'inactive_user' using errcode = '42501';
  end if;

  update public.profiles
  set active_session_id = p_session_id,
      updated_at = now()
  where id = auth.uid();

  return found;
end;
$$;

revoke all on function public.claim_active_session(uuid) from public;
grant execute on function public.claim_active_session(uuid) to authenticated;

create or replace function public.release_active_session(p_session_id uuid default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  update public.profiles
  set active_session_id = null,
      updated_at = now()
  where id = auth.uid()
    and (p_session_id is null or active_session_id = p_session_id);

  return found;
end;
$$;

revoke all on function public.release_active_session(uuid) from public;
grant execute on function public.release_active_session(uuid) to authenticated;

comment on column public.profiles.active_session_id is
  'Sessioni aktiv i lejuar për ky user; përdoret për single-device login në frontend.';

comment on function public.get_my_session_state() is
  'Kthen statusin aktiv të user-it dhe session_id e lejuar për krahasim në frontend.';

comment on function public.claim_active_session(uuid) is
  'Vendos session_id aktiv për user-in aktual në mënyrë që vetëm një login të mbetet aktiv.';

comment on function public.release_active_session(uuid) is
  'Pastron session_id aktiv vetëm nëse përputhet me sesionin aktual ose kur kërkohet pa parametër.';
