# ADR 0001: Use Supabase as the backend

Status: accepted (2026-11-21)

## Context

The 2022 FYP relied on hosting-level SSL/DDoS protection only. It had no stated password hashing, no input validation, no access control at the data layer and no audit trail (SPEC section 1). v2 is a security-first remake, built as a live, demo-able portfolio project on free tiers with fictional data only. It needs Postgres, authentication, file storage, realtime updates and scheduled jobs.

## Decision

Use Supabase (Postgres, Auth, Storage, Realtime, Edge Functions / pg_cron) as the backend, with `@supabase/ssr` for cookie-based auth (SPEC section 3). Authorisation is enforced in the database with row-level security; every new table enables RLS in the migration that creates it (CONSTRAINTS.md floor). Migrations live in `supabase/migrations/` and the seed in `supabase/seed.sql`.

## Consequences

- One free-tier platform covers database, auth, storage and realtime, so there is no extra service to run.
- RLS policies become the authorisation layer and are tested with pgTAP (`supabase test db`).
- Free-plan gaps (30-minute inactivity timeout, leaked-password check) are handled in application code (foundation decisions, spec amendments).
- Vendor coupling to Supabase APIs and its auth model; the Postgres schema itself stays portable.
