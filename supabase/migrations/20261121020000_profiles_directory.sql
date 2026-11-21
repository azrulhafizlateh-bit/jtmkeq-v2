-- Task 1.1 fix round 1: data minimisation for profiles (SPEC section 7: everyone reads name/role only).
-- The base table is readable only by the row owner and PHEP; other staff go through staff_directory().

drop policy profiles_select_authenticated on public.profiles;
drop policy profiles_update_self_or_phep on public.profiles;
drop policy profiles_insert_phep on public.profiles;

create policy profiles_select_self_or_phep on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.auth_role()) = 'phep');

create policy profiles_insert_phep on public.profiles
  for insert to authenticated
  with check ((select public.auth_role()) = 'phep');

create policy profiles_update_self_or_phep on public.profiles
  for update to authenticated
  using (
    (id = (select auth.uid()) and (select public.is_active_user()))
    or (select public.auth_role()) = 'phep'
  )
  with check (
    (id = (select auth.uid()) and (select public.is_active_user()))
    or (select public.auth_role()) = 'phep'
  );

-- Minimal staff directory: id, name and role of ACTIVE profiles, for active callers only.
create function public.staff_directory()
returns table (id uuid, full_name text, role public.user_role)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.role
  from public.profiles p
  where p.is_active
    and (select public.is_active_user())
$$;

revoke execute on function public.staff_directory() from public, anon;
grant execute on function public.staff_directory() to authenticated, service_role;

-- Harden the guard bypass: only trusted server-side roles without a JWT identity skip the column rules.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'profiles.id is immutable' using errcode = '42501';
  end if;

  if (select auth.uid()) is null
     and current_user in ('postgres', 'service_role', 'supabase_admin')
  then
    return new;
  end if;

  if (select public.auth_role()) is distinct from 'phep'::public.user_role
     and (to_jsonb(new) - 'phone' - 'updated_at') is distinct from (to_jsonb(old) - 'phone' - 'updated_at')
  then
    raise exception 'only PHEP may change profile fields other than phone' using errcode = '42501';
  end if;

  return new;
end;
$$;
