# Phase 0–1: Setup, Auth & Roles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Vercel-deployed Next.js app with CI, Supabase (hosted dev + CI-local), and working email/password auth where three seeded fictional users (PHEP, PA, KJ) log in and see role-specific navigation in the Wayfinding app shell.

**Architecture:** Next.js App Router (Server Components + Server Actions) on Vercel; Supabase Auth via `@supabase/ssr` cookies; Postgres RLS is the authority, with server-side checks and UI hiding as extra layers. Developer machine talks to a hosted `jtmkeq-dev` project; CI runs an ephemeral `supabase start` on the GitHub runner for migrations, pgTAP and E2E.

**Tech Stack:** Next.js (latest), TypeScript strict, Tailwind + shadcn/ui + lucide-react, next-themes, Zod, react-hook-form, Supabase CLI + `@supabase/ssr` + `@supabase/supabase-js`, Vitest (+ v8 coverage), Playwright + `@axe-core/playwright`, pnpm, GitHub Actions, Vercel.

**Spec:** `SPEC.md` (§3, §4, §5.1, §7, §8, §9, §10, §14 Phase 0–1, §15, §15b), `docs/superpowers/specs/2026-11-21-foundation-decisions-design.md`, `CONSTRAINTS.md`, `DESIGN.md`, `PRODUCT.md`.

## Global Constraints

- TypeScript `strict: true`; ESLint `--max-warnings=0`; Prettier clean; no new suppressions (CONSTRAINTS.md floor).
- Check current official docs before using any Next.js / Supabase API (source-driven). Known drift to check: Next ≥ 16 names the request hook `proxy.ts` (formerly `middleware.ts`); Supabase now issues publishable/secret keys alongside legacy anon/service_role — keep SPEC env names, accept either key format.
- Env vars exactly as SPEC §3; `.env.local` never committed; `.env.example` committed.
- `SUPABASE_SERVICE_ROLE_KEY` only read in modules starting with `import 'server-only'`.
- No public sign-up. Password min length **10**. Login rate limit **5 attempts / 15 min per IP+email**. Session inactivity timeout **30 min**. Generic login error: "Email or password is incorrect."
- Dates `DD MMM YYYY`, timezone `Asia/Kuala_Lumpur`.
- Fictional data only; matric prefix `99`; seed emails on `@jtmkeq.test`.
- Conventional Commits; one branch + PR per phase (`phase-0-setup`, `phase-1-auth`).
- Node: CI uses Node 24 LTS; `engines.node >= 22`. pnpm store lives outside OneDrive (`pnpm config set store-dir C:\pnpm-store` — user-level config, not committed).
- UI follows `DESIGN.md` tokens and `.impeccable/surfaces/app-app-layout-tsx.md`; read the Impeccable craft floor before UI edits.

## Review Focus

1. **Open redirect via `?next=`** on `/login` and auth callback — only same-origin relative paths starting with `/` (not `//`) are honoured; else `/dashboard`. → test in Task 1.5.
2. **Deactivated user with a still-valid session cookie** must be signed out on the next request, not just blocked at login. → test in Task 1.4 / 1.8.
3. **A user updating their own `profiles.role` or `is_active`** through the Supabase client directly (bypassing UI) must be rejected by the DB. → pgTAP in Task 1.1.
4. **Email case/whitespace** (`" PA@Jtmkeq.test "`) must hit the same rate-limit bucket and the same account. → test in Task 1.2.
5. **Reused or expired password-reset link** shows a clear "link expired, request a new one" state, not a crash. → E2E in Task 1.8.

---

## Phase 0 — Setup

### Task 0.1: Repo hygiene and scaffold

**Files:** Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.gitignore`, `.gitattributes` (`* text=auto eol=lf`), `.editorconfig`, `.nvmrc` (`24`), `.env.example`, `README.md` (stub: pitch + quick start placeholder), `CHANGELOG.md` (Keep a Changelog, `[Unreleased]`), `CLAUDE.md` + `AGENTS.md` (one line: "Read CONSTRAINTS.md, DESIGN.md and SPEC.md before writing code. Do not weaken CONSTRAINTS.md to make a change pass."), `app/layout.tsx`, `app/(public)/page.tsx`.

- [ ] `git init -b main`; first commit contains only SPEC/PRODUCT/CONSTRAINTS/DESIGN/docs/.impeccable (`docs: add spec, constraints and design direction`).
- [ ] Create branch `phase-0-setup`. Scaffold with `pnpm create next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm` (into a temp dir and move files if the CLI refuses a non-empty folder).
- [ ] Add scripts: `dev`, `build`, `start`, `lint` (`eslint . --max-warnings=0`), `typecheck` (`tsc --noEmit`), `format` / `format:check` (Prettier), `test` (`vitest run`), `test:watch`, `test:e2e` (`playwright test`), `check` (`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`).
- [ ] Run `pnpm check` → all pass. Commit `chore: scaffold Next.js app with TypeScript, Tailwind, ESLint, Prettier`.

### Task 0.2: Design tokens, fonts, shadcn, hello page, health route

**Files:** Modify `app/globals.css` (DESIGN.md §2 tokens as CSS vars for light + `.dark`, mapped into Tailwind theme), `app/layout.tsx` (Overpass + Overpass Mono via `next/font/google`, `lang="en"`), Create `components.json` (shadcn init), `components/ui/button.tsx`, `app/(public)/page.tsx` (hello page), `app/api/health/route.ts`, `lib/version.ts`.

**Interfaces — Produces:** `GET /api/health` → `200 {"status":"ok","version":string,"time":ISO string}`, header `Cache-Control: no-store`.

- [ ] Write `tests/unit/api/health.test.ts`: calling the exported `GET()` returns status 200, JSON `status === "ok"`, `version` non-empty, header `cache-control` is `no-store`. Run → FAIL.
- [ ] Implement route; `version` from `process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7) ?? "dev"`. Run → PASS.
- [ ] `pnpm dlx shadcn@latest init`, add `button`; restyle to DESIGN.md §7 (4px radius, 700 weight, green primary).
- [ ] Hello page: green header band with wordmark "JTMK e-Quarantine", one-line pitch, a distance plate "v2 · Phase 0 →", demo banner text if `DEMO_MODE=true`. Must pass axe (Task 0.3).
- [ ] Commit `feat: add design tokens, fonts, hello page and health endpoint`.

### Task 0.3: Test tooling (Vitest + Playwright + axe)

**Files:** Create `vitest.config.ts`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts`, `lib/utils/date.ts`, `tests/unit/utils/date.test.ts`.

**Interfaces — Produces:** `formatDate(input: Date | string): string` → `DD MMM YYYY` in Asia/Kuala_Lumpur (e.g. `"2026-11-20T17:30:00Z"` → `"21 Nov 2026"`).

- [ ] Vitest: `environment: node` default, `include: ["tests/unit/**/*.test.ts"]`, coverage v8 on `lib/**` with thresholds `lines/branches/functions/statements: 70` (enforced from Phase 1 per CONSTRAINTS; set now, exclude nothing).
- [ ] Test `formatDate`: the UTC-to-MYT rollover case above; `"2026-01-05"` → `"05 Jan 2026"`; invalid string throws `RangeError`. FAIL → implement with `Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kuala_Lumpur",day:"2-digit",month:"short",year:"numeric"})` → PASS.
- [ ] Playwright: projects `chromium` desktop + `mobile` (360×740); `webServer: pnpm build && pnpm start` on 3000; `baseURL` from `E2E_BASE_URL` or localhost.
- [ ] `smoke.spec.ts`: `/` shows "JTMK e-Quarantine"; `/api/health` 200; axe scan of `/` has zero `critical`/`serious`; at 360px `document.documentElement.scrollWidth <= 360`.
- [ ] Run `pnpm test` and `pnpm test:e2e` → PASS. Commit `test: add Vitest, Playwright and axe smoke tests`.

### Task 0.4: Supabase CLI, env validation, typed clients

**Files:** Create `supabase/config.toml` (via `pnpm supabase init`), `supabase/migrations/<ts>_init.sql` (`create extension if not exists pgcrypto;` only), `supabase/tests/000_smoke.test.sql` (pgTAP: `select plan(1); select has_extension('pgcrypto'); select * from finish();`), `supabase/seed.sql` (empty, commented), `lib/env.ts`, `lib/env.server.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `lib/supabase/database.types.ts`, `scripts/db-guard.mjs`, `tests/unit/env.test.ts`.

**Interfaces — Produces:**
- `publicEnv: { NEXT_PUBLIC_SUPABASE_URL: string; NEXT_PUBLIC_SUPABASE_ANON_KEY: string }` (Zod-parsed).
- `serverEnv()` in `lib/env.server.ts` (`import 'server-only'`): adds `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_MODE: boolean`, optional later secrets.
- `createBrowserSupabase()`, `createServerSupabase(): Promise<SupabaseClient<Database>>` (uses `cookies()`), `createAdminSupabase()` (`server-only`, service role, no session persistence).

- [ ] `supabase` as devDependency; scripts: `db:link` (`supabase link`), `db:push` (`node scripts/db-guard.mjs && supabase db push`), `db:reset` (guard, then `supabase db reset --linked`), `db:seed`, `db:types` (`supabase gen types typescript --linked > lib/supabase/database.types.ts`), `db:test` (`supabase test db`, CI only).
- [ ] `db-guard.mjs`: reads `supabase/.temp/project-ref`; exits 1 with "Refusing: linked project is PROD" if it equals `SUPABASE_PROD_REF` env.
- [ ] Test `env.test.ts`: valid env parses; missing URL throws listing the key name; `DEMO_MODE="true"` → `true`, absent → `false`. FAIL → implement → PASS.
- [ ] Commit `chore: add Supabase CLI, env validation and typed clients`.

### Task 0.5: CI, Dependabot, templates

**Files:** Create `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/bug.yml`, `.github/ISSUE_TEMPLATE/feature.yml`, `docs/adr/0001-use-supabase.md`, `docs/adr/0005-hosted-dev-no-local-docker.md`.

- [ ] `ci.yml` on push + PR, jobs:
  - `quality`: pnpm install (frozen), `format:check`, `lint`, `typecheck`, `test --coverage`, `pnpm audit --audit-level=high`.
  - `secrets`: `gitleaks/gitleaks-action` (redacted output).
  - `db`: `supabase/setup-cli`, `supabase start`, `supabase db reset`, `supabase test db`.
  - `e2e` (needs db): `supabase start`, export local URL/keys from `supabase status -o env` to `.env.local`, `supabase db reset` (applies seed), `playwright install --with-deps chromium`, `pnpm test:e2e`; upload report on failure.
- [ ] Dependabot: npm weekly grouped (`minor-and-patch`), github-actions monthly.
- [ ] Prove gates bite: on a scratch commit add a deliberate lint error and a failing test, confirm CI red, revert (CONSTRAINTS "prove it fails").
- [ ] Commit `ci: add lint, typecheck, test, audit, gitleaks, pgTAP and e2e workflow`.

### Task 0.6: GitHub + Vercel (needs user)

- [ ] User: install GitHub CLI and `gh auth login`; I run `gh repo create jtmkeq-v2 --public --source . --push`; enable secret scanning + push protection (`gh api` repo security settings).
- [ ] Open PR `phase-0-setup` → CI green.
- [ ] User: import repo in Vercel dashboard, set env vars (Preview + Production) from `.env.example`; I confirm the preview URL serves `/` and `/api/health`.
- [ ] Merge PR; tag nothing yet. Phase 0 ✅ when CI green + preview URL live.

---

## Phase 1 — Auth & Roles

### Task 1.1: `profiles` schema, helpers, RLS (DB)

**Files:** Create `supabase/migrations/<ts>_profiles.sql`, `supabase/tests/010_profiles_rls.test.sql`, `docs/adr/0002-rls-as-authorisation.md`.

**Interfaces — Produces (SQL):** `type user_role as enum ('phep','pa','kj')`; table `profiles(id uuid pk references auth.users on delete cascade, full_name text not null check(length<=120), staff_id text unique not null check(length<=20), role user_role not null, phone text check(length<=20), is_active boolean not null default true, is_demo boolean not null default false, last_login_at timestamptz, created_at, updated_at)`; `auth_role() returns user_role` (security definer, stable, `search_path=''`, returns null for inactive); `is_active_user() returns boolean`; trigger `profiles_guard` (BEFORE UPDATE) raising `42501` when a non-PHEP changes anything other than `phone` on their own row, or anyone changes `id`; `updated_at` trigger.

> `is_demo` is an addition to SPEC §6 (needed for §5.13 demo restrictions and the D6 MFA exemption). **Flag for owner approval** before running this task.

- [ ] Write pgTAP (one assertion per policy): authenticated user reads active profiles (name, role); anon reads nothing; PA cannot insert a profile; PA updates own `phone` → ok; PA sets own `role='phep'` → throws 42501; PA sets own `is_active=false` → throws; PA updates another user's phone → 0 rows; PHEP updates any user's role → ok; KJ cannot update others; inactive user's `auth_role()` is null. Run in CI → FAIL.
- [ ] Write migration: enable RLS; policies `profiles_select_authenticated`, `profiles_insert_phep`, `profiles_update_self_or_phep`; revoke all from `anon`. Run → PASS.
- [ ] `pnpm db:push` to dev, `pnpm db:types`. Commit `feat(db): add profiles with role helpers and RLS`.

### Task 1.2: Login rate limiting (DB + lib)

**Files:** Create `supabase/migrations/<ts>_login_attempts.sql`, `supabase/tests/020_login_rate_limit.test.sql`, `lib/auth/rate-limit.ts`, `lib/crypto/hash.ts`, `tests/unit/auth/rate-limit.test.ts`.

**Interfaces — Produces:**
- SQL: `login_attempts(id bigserial, key_hash text not null, success boolean not null, created_at timestamptz default now())`, RLS on with **no** policies (service role only); `check_login_allowed(p_key_hash text) returns boolean` (false when ≥ 5 failures in the last 15 min since last success); `record_login_attempt(p_key_hash text, p_success boolean)`. Both `security definer`, executable by `service_role` only.
- TS: `normaliseEmail(email: string): string` (trim + lowercase); `sha256Hex(input: string): Promise<string>`; `rateLimitKey(email: string, ip: string): Promise<string>` = `sha256Hex(normaliseEmail(email) + "|" + ip)`.

- [ ] Unit: `rateLimitKey(" PA@Jtmkeq.test ", "1.2.3.4") === rateLimitKey("pa@jtmkeq.test","1.2.3.4")`; different IP → different key; output is 64 hex chars and never contains the email. FAIL → implement → PASS.
- [ ] pgTAP: 4 failures → allowed; 5th → not allowed; failures older than 15 min ignored; `authenticated` role cannot execute either function or select the table. FAIL → migration → PASS.
- [ ] Commit `security: add login rate limiting`.

### Task 1.3: Permissions matrix and role navigation (pure)

**Files:** Create `lib/auth/permissions.ts`, `lib/auth/nav.ts`, `tests/unit/auth/permissions.test.ts`, `tests/unit/auth/nav.test.ts`.

**Interfaces — Produces:**
- `type Role = "phep" | "pa" | "kj"`; `type Capability` = string-literal union covering every SPEC §4 row (e.g. `"users.manage"`, `"students.create"`, `"students.verify"`, `"cases.create"`, `"cases.verify"`, `"deletion.request"`, `"deletion.decide"`, `"security.view"`, `"audit.view"`, `"reports.export"`, `"feedback.manage"`, `"sop.manage"`, …).
- `can(role: Role, cap: Capability): boolean` (scope qualifiers like "own advisees" are enforced in RLS; this answers "may this role ever").
- `navFor(role: Role): NavItem[]`, `NavItem = { href: string; labelKey: string; icon: LucideIconName; cap?: Capability }`.

- [ ] Table-driven test from SPEC §4: e.g. `can("pa","students.verify") === false`, `can("kj","deletion.decide") === true`, `can("pa","audit.view") === false`, `can("phep","sop.manage") === true`, `can("kj","students.create") === false`. Nav: PHEP includes `/verify`, `/admin/users`, `/approvals`, `/security`, `/audit`; PA includes `/students/new`, excludes `/verify`, `/audit`, `/security`; KJ includes `/security`, `/audit`, `/approvals`, excludes `/students/new`, `/verify`. FAIL → implement → PASS.
- [ ] Commit `feat(auth): add role permission matrix and navigation`.

### Task 1.4: Session handling in the request hook

**Files:** Create `lib/supabase/middleware.ts`, `proxy.ts` (or `middleware.ts` per installed Next version), `lib/auth/session.ts`, `lib/auth/redirect.ts`, `tests/unit/auth/session.test.ts`, `tests/unit/auth/redirect.test.ts`.

**Interfaces — Produces:**
- `INACTIVITY_LIMIT_MS = 30 * 60 * 1000`; `isInactive(lastActivityMs: number | null, nowMs: number): boolean` (null → false on first request).
- `safeNext(next: string | null | undefined): string` → returns `next` only if it starts with `/` and not `//` or `/\`; else `"/dashboard"`.
- `updateSession(request): Promise<NextResponse>`: refreshes Supabase session (per current `@supabase/ssr` docs), sets/reads httpOnly SameSite=Lax cookie `jtmkeq_last_activity`; if inactive → sign out and redirect `/login?reason=timeout`; protected prefixes (`/dashboard`, `/students`, `/cases`, `/verify`, `/reports`, `/admin`, `/audit`, `/feedback`, `/sop`, `/settings`, `/security`, `/approvals`, `/clearance`) without user → redirect `/login?next=<path>`.
- Deactivated users: `(app)/layout.tsx` calls `getCurrentProfile()`; if `!is_active` → sign out, redirect `/login?reason=inactive`.

- [ ] Unit: `isInactive(now-29min, now) === false`, `isInactive(now-31min, now) === true`, `isInactive(null, now) === false`; `safeNext("/students")==="/students"`, `safeNext("//evil.com")==="/dashboard"`, `safeNext("https://evil.com")==="/dashboard"`, `safeNext("/\\evil.com")==="/dashboard"`, `safeNext(undefined)==="/dashboard"`. FAIL → implement → PASS.
- [ ] Commit `security: add session refresh, route protection and inactivity timeout`.

### Task 1.5: Validation, password policy, auth actions

**Files:** Create `lib/validation/auth.ts`, `lib/auth/pwned.ts`, `app/(public)/login/actions.ts`, `app/(public)/forgot-password/actions.ts`, `app/(public)/reset-password/actions.ts`, `app/auth/confirm/route.ts`, `app/(app)/actions/logout.ts`, `lib/auth/profile.ts`, tests `tests/unit/validation/auth.test.ts`, `tests/unit/auth/pwned.test.ts`.

**Interfaces — Produces:**
- `loginSchema` `{ email: email ≤ 254, password: string 1..128 }`; `forgotSchema` `{ email }`; `resetPasswordSchema` `{ password: 10..128, confirm }` with refine "Passwords do not match".
- `isPwnedPassword(password: string, fetcher = fetch): Promise<boolean>` — HIBP range API `https://api.pwnedpasswords.com/range/<first5>` with `Add-Padding: true`; sends only the 5-char SHA-1 prefix; on network failure returns `false` and logs a warning (fail-open, documented in SECURITY.md later).
- `loginAction(prev, formData): Promise<{ error?: string }>`: Zod parse → `check_login_allowed` (admin client) → `signInWithPassword` → on failure record + return generic error; on success record, check profile `is_active` (sign out + generic error if not), update `last_login_at`, `redirect(safeNext(next))`. Rate-limited response: "Too many attempts. Try again in 15 minutes."
- `forgotPasswordAction`: always returns the same success message ("If that email has an account, a reset link is on its way.") regardless of existence; demo accounts (`is_demo`) silently skipped.
- `/auth/confirm`: `verifyOtp({ type, token_hash })` then redirect to `safeNext(next)`; invalid/expired → `/forgot-password?reason=expired`.
- `resetPasswordAction`: Zod + `isPwnedPassword` ("This password has appeared in a data breach. Choose another.") → `updateUser({ password })`; demo users blocked.
- `getCurrentProfile(): Promise<Profile | null>` (server-only, cached per request).

- [ ] Unit: schemas reject 9-char password, accept 10; mismatched confirm fails with the message; email > 254 rejected. `isPwnedPassword` with a fake fetcher: request URL contains only 5 uppercase hex chars after `/range/`; returns true when suffix present with count > 0, false when absent, false on thrown fetch. FAIL → implement → PASS.
- [ ] Commit `feat(auth): add login, logout, forgot and reset password flows`.

### Task 1.6: Public auth pages (UI)

**Files:** Create `app/(public)/login/page.tsx`, `app/(public)/forgot-password/page.tsx`, `app/(public)/reset-password/page.tsx`, `components/forms/login-form.tsx`, `components/forms/password-form.tsx`, `components/brand/wordmark.tsx`, `components/brand/distance-plate.tsx`.

- [ ] Load Impeccable craft floor; build per DESIGN.md: green sign field on the left (desktop) / top (mobile) with wordmark and PDPA purpose notice ("This system processes student quarantine records for JTMK staff only. Data is fictional in this demo." + link `/privacy` placeholder); form on the right. Labelled fields, visible focus, errors in `aria-live`, `reason=timeout|inactive|expired` banners.
- [ ] `DistancePlate` props `{ label: string; value: string; arrow?: boolean }` — reused by the shell.
- [ ] Commit `feat(ui): add login, forgot and reset password pages`.

### Task 1.7: App shell and role dashboards

**Files:** Create `app/(app)/layout.tsx`, `components/shell/rail.tsx`, `components/shell/top-bar.tsx`, `components/shell/mobile-header.tsx`, `components/shell/bottom-nav.tsx`, `components/shell/user-menu.tsx`, `components/shell/theme-toggle.tsx`, `components/providers.tsx` (next-themes), `app/(app)/dashboard/page.tsx`, `app/(app)/error.tsx`, `app/(app)/loading.tsx`, `app/not-found.tsx`, `messages/en.json` (nav labels only; next-intl wiring is Phase 8).

**Interfaces — Consumes:** `navFor(role)`, `getCurrentProfile()`, `logoutAction`.

- [ ] Shell per DESIGN.md §5–6: 248px green rail ≥1024 (collapsible to 64px, state in cookie), top bar with title, bell placeholder (disabled, "Notifications arrive in a later phase" tooltip), theme toggle, user menu (name, role, logout). <768: green mobile header + bottom nav (first 4 items) + "More" sheet.
- [ ] `/dashboard`: role-aware heading ("Student Affairs overview" / "My advisees" / "Department overview") and an empty state per role explaining what arrives in Phase 4. No fake KPIs.
- [ ] Commit `feat(ui): add Wayfinding app shell with role-aware navigation`.

### Task 1.8: Seed users and end-to-end proof

**Files:** Modify `supabase/seed.sql`; Create `tests/e2e/auth.spec.ts`, `tests/e2e/fixtures/users.ts`, `docs/adr/0003-session-timeout-in-app.md`.

- [ ] Seed (fictional, `@jtmkeq.test`, password from `SEED_USER_PASSWORD` env in CI / documented default only for local CI DB): `phep1@`, `pa1@`, `kj1@` + `inactive-pa@` (`is_active=false`). Inserts into `auth.users` + `auth.identities` + `profiles` per current Supabase seeding guidance. For the hosted dev project, `pnpm db:seed` creates the same users via the admin API (`scripts/seed-users.mjs`) since `seed.sql` does not run on `db push`.
- [ ] E2E (desktop + 360px): each role logs in → lands on `/dashboard` → sees exactly its nav (PHEP sees "Verify queue", PA sees "Add student", KJ sees "Security insights" and not "Verify queue"); unauthenticated `/students` → `/login?next=%2Fstudents` → after login lands on `/students` (404 page acceptable this phase); `?next=//evil.com` lands on `/dashboard`; wrong password shows generic message; 6th wrong attempt shows rate-limit message; inactive user cannot log in; logout clears session (back button to `/dashboard` → `/login`); expired reset link → `/forgot-password?reason=expired` banner; axe zero critical/serious on `/login` and `/dashboard` for each role; no horizontal scroll at 360px.
- [ ] Coverage gate on `lib/**` ≥ 70% passes. Run full `pnpm check` + CI green.
- [ ] Update `CHANGELOG.md`, README quick start (hosted-project steps). Open PR `phase-1-auth`, merge when green. Phase 1 ✅ when three seeded users log in and see role-specific nav.

---

## Manual steps for the owner (collected)

1. Install GitHub CLI (`winget install GitHub.cli`) and run `gh auth login`.
2. Create two free Supabase projects (`jtmkeq-dev`, `jtmkeq-prod`, region Singapore); send me the dev project ref; put keys in `.env.local` yourself (I never see the service key in chat).
3. In Supabase Auth settings: disable public sign-ups; set Site URL + redirect URLs (localhost:3000, Vercel preview/prod).
4. Import the GitHub repo into Vercel; add env vars for Preview + Production.
5. Approve the `profiles.is_demo` column (data-model change, Task 1.1).
