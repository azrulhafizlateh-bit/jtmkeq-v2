# JTMK e-Quarantine v2

Security-first remake of my 2022 diploma FYP: COVID-19 quarantine tracking for JTMK, POLIMAS.

Status: in development (Phase 0)

## Quick start

Coming in Phase 0.

## Database scripts

Hosted dev project only (no local Docker). Link first with `pnpm db:link`.

- `pnpm db:push`, `db:reset`, `db:seed` run `scripts/db-guard.mjs` first; it refuses to run if no project is linked or the linked ref equals `SUPABASE_PROD_REF`.
- `pnpm db:types` regenerates `lib/supabase/database.types.ts`.
- `pnpm db:test` runs pgTAP tests and is CI only (needs Docker).
