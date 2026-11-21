-- Task 1.1: profiles (1:1 with auth.users), role helpers, guard trigger, RLS.
-- RLS is the authoritative access control (docs/adr/0002-rls-as-authorisation.md).

create type public.user_role as enum ('phep', 'pa', 'kj');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(full_name) <= 120),
  staff_id text not null unique check (length(staff_id) <= 20),
  role public.user_role not null,
  phone text check (length(phone) <= 20),
  is_active boolean not null default true,
  -- Addition to SPEC section 6 (owner-approved): demo accounts (section 5.13, MFA exemption).
  is_demo boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Privileges: nothing for anon; authenticated may select/insert/update (RLS narrows); never delete.
revoke all on table public.profiles from public, anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;

-- Helpers. security definer so they can read profiles inside RLS policies without recursion.
create function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active
$$;

create function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active
  )
$$;

revoke execute on function public.auth_role() from public, anon;
revoke execute on function public.is_active_user() from public, anon;
grant execute on function public.auth_role() to authenticated, service_role;
grant execute on function public.is_active_user() to authenticated, service_role;

-- updated_at maintenance (reusable by later tables).
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Guard: column-level rules RLS cannot express.
-- id is immutable for everyone. Non-PHEP callers may change only phone.
-- Privileged sessions without a JWT identity (service role, migrations) are not restricted otherwise.
create function public.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'profiles.id is immutable' using errcode = '42501';
  end if;

  if (select auth.uid()) is null and current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if public.auth_role() is distinct from 'phep'::public.user_role
     and (to_jsonb(new) - 'phone' - 'updated_at') is distinct from (to_jsonb(old) - 'phone' - 'updated_at')
  then
    raise exception 'only PHEP may change profile fields other than phone' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.profiles_guard() from public, anon, authenticated;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Policies (SPEC section 7).
create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (is_active or id = (select auth.uid()) or public.auth_role() = 'phep');

create policy profiles_insert_phep on public.profiles
  for insert to authenticated
  with check (public.auth_role() = 'phep');

create policy profiles_update_self_or_phep on public.profiles
  for update to authenticated
  using ((id = (select auth.uid()) and public.is_active_user()) or public.auth_role() = 'phep')
  with check ((id = (select auth.uid()) and public.is_active_user()) or public.auth_role() = 'phep');
