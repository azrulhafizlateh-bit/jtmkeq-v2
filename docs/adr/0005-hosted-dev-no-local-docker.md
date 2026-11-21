# ADR 0005: Hosted Supabase for development, Docker only in CI

Status: accepted (2026-11-21)

## Context

The developer machine has no Docker (owner decision D2 in the foundation decisions doc), and the project lives in OneDrive on Windows. Supabase's local stack (`supabase start`) requires Docker. Database migrations and RLS policies still need automated tests on a real Supabase-compatible database.

Alternatives considered: running tests against the hosted dev database inside rolled-back transactions (slower, flaky, and CI would need dev database secrets); a native Windows Postgres imitating Supabase auth and storage (diverges from the real platform, so policy tests could be wrong).

## Decision

Develop against a hosted Supabase dev project (`jtmkeq-dev`); the live demo runs on a separate prod project (`jtmkeq-prod`). GitHub Actions runs `supabase start` on the Ubuntu runner (Docker preinstalled), then `supabase db reset` and `supabase test db` on an ephemeral database for every push and pull request. The Playwright E2E job also starts its own ephemeral Supabase. `pnpm db:reset` targets the linked hosted dev project and is guarded by `scripts/db-guard.mjs`, which refuses to run against the prod ref. No `docker-compose.yml` is shipped; `supabase start` stays an optional path for reviewers who have Docker.

## Consequences

- Locally the fast loop is typecheck, lint, format and unit tests; DB and RLS tests only run in CI (CONSTRAINTS.md, environment notes).
- Development needs internet access and shares one dev database.
- CI needs no database secrets, because it uses throwaway local stacks.
- SPEC section 3 "Docker Compose + Supabase CLI" and section 15b "one-command docker compose up" are replaced by a `pnpm setup` flow against a hosted project.
