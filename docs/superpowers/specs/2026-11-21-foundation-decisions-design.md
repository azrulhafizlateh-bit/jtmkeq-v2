# Foundation decisions (pre-Phase 0)

Date: 2026-11-21. Source of truth for features remains `SPEC.md`; this file records decisions that amend or clarify it.

## Intent
Security-first remake of the 2022 JTMK e-Quarantine FYP as a live, demo-able portfolio project for recruiters/engineers. Free tiers only; fictional data only.

## Decisions (owner's answers)
| # | Topic | Decision |
|---|---|---|
| D1 | Folder | Project stays in OneDrive (`Desktop\jtmkeq-v2`). Mitigation: pnpm store kept outside OneDrive (`store-dir` in user config); pause OneDrive sync during large installs if file-lock errors appear. |
| D2 | Docker | **No Docker on the developer machine.** Approach A chosen (below). |
| D3 | Email | Not yet answered. Interim: hosted Supabase built-in SMTP (delivers only to project team members — enough for solo dev). Resend free tier proposed for public demo (Phase 9); confirm before adding. |
| D4 | Login rate limit | Postgres table + `security definer` function (no extra service). |
| D5 | GitHub | Repo `jtmkeq-v2`, public from day one. |
| D6 | MFA | TOTP enforced for real PHEP accounts; demo accounts exempt. |
| D7 | Design | Two directions proposed in `DESIGN.md`; owner picks one. |

## Approaches considered for D2
- **A. Hosted Supabase dev + prod projects; Docker only inside GitHub Actions** — *chosen.* Dev against `jtmkeq-dev` (hosted, free); live/demo on `jtmkeq-prod`. CI runs `supabase start` on the Ubuntu runner (Docker preinstalled) so migrations + RLS (pgTAP) tests run on an ephemeral DB every push. Trade-off: needs internet for dev; shared dev DB.
- B. Hosted only, tests against dev DB in rolled-back transactions — rejected: slower, flaky, CI needs dev DB secrets.
- C. Native Windows Postgres faking Supabase auth/storage — rejected: diverges from real platform; policy tests could lie.

## Spec amendments caused by these decisions
- §3 "Local dev: Docker Compose + Supabase CLI" and §15b "one-command `docker compose up`" → replaced by: `pnpm setup` script that links the Supabase CLI to a hosted project, pushes migrations, seeds, and starts `next dev`. `supabase start` remains documented as an optional path for reviewers who have Docker. No `docker-compose.yml`.
- `pnpm db:reset` resets the **linked hosted dev project** (guarded: refuses if linked ref equals prod ref).
- Supabase free-plan gaps handled in app code: 30-min inactivity timeout (last-activity cookie checked in middleware); leaked-password check via HIBP k-anonymity range API on set/reset password (only first 5 SHA-1 hex chars leave the server).

## Left to the builder
Exact tool versions (checked against current docs at install time), file layout within `SPEC.md` §15, test naming.
