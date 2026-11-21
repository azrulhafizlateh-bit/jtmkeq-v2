# ADR 0002: Postgres RLS is the authorisation authority

Status: accepted (2026-11-21)

## Context

SPEC section 4 requires permissions to be enforced in three places: the UI, server actions, and Postgres. The app is security-first and demonstrates defence in depth. UI hiding and server-action checks can be bypassed by calling Supabase directly with a user JWT, so they cannot be the only control.

## Decision

Row-Level Security policies, plus guard triggers for column-level rules, are the authoritative access control. Every table enables RLS in the migration that creates it, `anon` gets no privileges on application tables, and role lookups go through `security definer` helpers (`auth_role()`, `is_active_user()`) with `search_path = ''`. Server actions and the UI check roles as additional layers for good errors and UX, never as the sole control. Every policy has a pgTAP test that runs in CI.

## Consequences

- A bug in a server action or UI check cannot grant access the database refuses.
- Rules RLS cannot express (which columns change) live in triggers and are tested the same way.
- Privileged work (user creation, last-login stamps) uses the service role, which bypasses RLS and so stays confined to `server-only` modules.
- Policies need careful performance and recursion handling (helpers are `stable security definer`, `auth.uid()` wrapped in a subselect).
- DB tests only run in CI because there is no local Docker (ADR 0005).
