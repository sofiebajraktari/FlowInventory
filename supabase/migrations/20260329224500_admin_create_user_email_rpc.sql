create or replace function public.admin_create_user_email(
  p_email text,
  p_password text,
  p_role text,
  p_username text default null
)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select public.admin_create_user(
    p_email,
    p_password,
    p_role,
    coalesce(nullif(p_username, ''), split_part(lower(trim(p_email)), '@', 1))
  );
$$;

revoke all on function public.admin_create_user_email(text, text, text, text) from public;
grant execute on function public.admin_create_user_email(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
