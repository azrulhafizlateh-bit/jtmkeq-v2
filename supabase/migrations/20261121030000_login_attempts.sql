-- Task 1.2: login rate limiting (SPEC section 8.2: 5 attempts / 15 min per IP+email).
-- key_hash is sha256(normalised email | ip), computed by the app; no email or IP is stored.
-- Service role only: RLS on with no policies, table privileges revoked from API roles.
-- Retention: rows older than 1 day carry no meaning and can be purged (purge job comes in a later phase).

create table public.login_attempts (
  id bigserial primary key,
  key_hash text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);

alter table public.login_attempts enable row level security;
revoke all on table public.login_attempts from public, anon, authenticated;
revoke all on sequence public.login_attempts_id_seq from public, anon, authenticated;

create index login_attempts_key_hash_created_at_idx
  on public.login_attempts (key_hash, created_at desc);

-- False when the key has 5 or more failures in the last 15 minutes since its most recent success.
create function public.check_login_allowed(p_key_hash text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) < 5
  from public.login_attempts a
  where a.key_hash = p_key_hash
    and not a.success
    and a.created_at > now() - interval '15 minutes'
    and a.id > coalesce(
      (
        select max(s.id)
        from public.login_attempts s
        where s.key_hash = p_key_hash
          and s.success
          and s.created_at > now() - interval '15 minutes'
      ),
      0
    )
$$;

create function public.record_login_attempt(p_key_hash text, p_success boolean)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.login_attempts (key_hash, success) values (p_key_hash, p_success)
$$;

revoke execute on function public.check_login_allowed(text) from public, anon, authenticated;
revoke execute on function public.record_login_attempt(text, boolean) from public, anon, authenticated;
grant execute on function public.check_login_allowed(text) to service_role;
grant execute on function public.record_login_attempt(text, boolean) to service_role;
