# JTMK e-Quarantine v2 (JTMKEQ) — Build Specification

> Remake of my Diploma FYP (POLIMAS, Session 2 2021/2022) as a modern, secure, deployed portfolio project.
> Scope stays **COVID-19 quarantine tracking** for the Department of Information Technology & Communication (JTMK).
> Audience: recruiters / engineers viewing it from LinkedIn. It must be **live, demo-able, well-documented and secure**.

**Instructions for Claude Code:** Read this whole file before writing code. Build phase by phase (Section 14). After each phase: run lint, typecheck and tests, then commit. Check the latest official docs for Next.js and Supabase (`@supabase/ssr`) rather than relying on memory. Ask me before changing the data model or adding a paid service. Load the skills listed in Section 15c at each step; all UI work follows `DESIGN.md` produced with `impeccable:impeccable`.

---

## 1. Background (the original system)

| Item | Original (2022) |
|---|---|
| Stack | PHP, HTML/CSS/JS, MySQL (XAMPP → cPanel on Syok Host) |
| DB | `jtmkfcom_web`: `user`, `student`, `quarantine`, `log`, `report` |
| Roles | PHEP (Student Affairs Officer, admin), PA (Academic Advisor), KJ (Head of Department) |
| Flow | PA adds student + quarantine record with HSO screenshot → PHEP verifies → everyone views lists & analysis |
| Pages | Landing, role home pages, Add User, Verify Student, Verify Quarantine, Add Student, Add Quarantine, Student List (card/table), Quarantine List (latest/history, card/table), Analysis, Contact, Complaint, SOP |

**Problems the original solved:** PAs tracked positive/close-contact students in scattered Excel/Google Forms; PHEP spent hours merging them daily; analysis was slow.

**Weaknesses to fix in v2:**
- Not mobile responsive; dated UI.
- "Analysis" was basic counts; no trends, no export.
- Security relied on hosting SSL/DDoS only — no stated password hashing, input validation, upload validation, or access control at the data layer.
- Only PHEP could reset passwords / delete; no audit trail of who changed what.
- No rejection flow (records could only be verified, not sent back with a reason).
- Testing was self-reported (one tester, all pass); performance claims unmeasured.

---

## 2. Goals

1. **Faithful to the original scope** — same three roles, same core workflow, COVID-19 only.
2. **Production-quality** — responsive, accessible, fast, typed, tested.
3. **Security as a headline feature** — row-level security, private file storage, audit log, validated uploads, rate-limited login (this is my specialisation; make it visible in the README).
4. **Real analytics** — dashboard with trends and exportable reports.
5. **Demo-able** — public live URL with one-click demo login for each role, seeded with **fictional** data only.
6. **Insider-threat aware** — the system watches its own staff users: suspicious behaviour in the audit log is flagged and explained (links to my degree FYP on explainable insider-threat detection).
7. **Integrity-first** — tamper-evident audit log, four-eyes approvals, verifiable clearance letters.
8. **Engineered like a real product** — load-tested, monitored, documented decisions, one-command local setup.

### Non-goals
- No real student data. No integration with MySejahtera or any government system.
- No native mobile app (responsive web only).
- No contact-tracing/location features.

---

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (latest, App Router) + TypeScript (strict) | Server Components + Server Actions |
| UI | Tailwind CSS + shadcn/ui + lucide-react | Light/dark mode |
| Charts | Recharts (via shadcn chart components) | |
| Forms/validation | react-hook-form + Zod | Same Zod schema validates client and server |
| Tables | TanStack Table | Sorting, filtering, pagination |
| Backend | Supabase: Postgres, Auth, Storage, Edge Functions / pg_cron | Use `@supabase/ssr` for cookie-based auth |
| Exports | CSV (native), PDF (`@react-pdf/renderer`) | |
| Testing | Vitest (unit), Playwright (E2E), pgTAP or SQL tests for RLS | |
| Realtime | Supabase Realtime | Verify queue, dashboard, notifications |
| OCR | Tesseract.js (runs in browser/worker, free) | Pre-fill + mismatch warning on HSO |
| QR codes | `qrcode` | Clearance letters |
| PWA | Serwist (or current recommended Next.js PWA lib) | Installable, offline shell |
| i18n | next-intl | English + Bahasa Melayu |
| Field encryption | AES-256-GCM in server code (Node `crypto`), key in env | Phone numbers; check if Supabase Vault fits better |
| Monitoring | Sentry (errors + performance), UptimeRobot/Better Stack (uptime) | Free tiers |
| Load testing | k6 | Scripts committed in `k6/` |
| Security testing | OWASP ZAP (baseline + full scan), manual tests | Report in `docs/pentest.md` |
| Local dev | Docker Compose + Supabase CLI | One-command setup |
| CI/CD | GitHub Actions → Vercel | |
| Package manager | pnpm | |

Environment variables (`.env.local`, never committed; provide `.env.example`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, never imported in client code
FIELD_ENCRYPTION_KEY=             # 32-byte base64, server-only
UPLOAD_LINK_SECRET=               # HMAC secret for student upload links
CLEARANCE_SIGNING_SECRET=         # HMAC secret for clearance letter tokens
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
DEMO_MODE=true
```

---

## 4. Roles & permissions

| Capability | PHEP (admin) | PA | KJ |
|---|:-:|:-:|:-:|
| Log in / log out / change own password | ✅ | ✅ | ✅ |
| Create, deactivate users; trigger password reset | ✅ | ❌ | ❌ |
| Add student | ❌ | ✅ (own advisees) | ❌ |
| Edit student | ✅ | ✅ (own, while pending/rejected) | ❌ |
| Verify / reject student | ✅ | ❌ | ❌ |
| Add quarantine case + upload HSO | ❌ | ✅ (own advisees) | ❌ |
| Edit quarantine case | ✅ | ✅ (own, while pending/rejected) | ❌ |
| Verify / reject quarantine case | ✅ | ❌ | ❌ |
| Mark case released early / extend end date | ✅ | ✅ (request → PHEP verifies) | ❌ |
| Request deletion of a verified record | ✅ | ❌ | ❌ |
| Approve/deny a deletion request (four-eyes, not own request) | ✅ (other PHEP) | ❌ | ✅ |
| Verify a record they created themselves | ❌ (blocked) | ❌ | ❌ |
| Send student a one-time HSO upload link | ❌ | ✅ (own advisees) | ❌ |
| Issue / revoke clearance letter | ✅ | ✅ (request) | ❌ |
| View Security Insights (insider-threat alerts) | ✅ | ❌ | ✅ |
| Acknowledge / dismiss an alert | ✅ (not alerts about self) | ❌ | ✅ |
| Run audit-log integrity check | ✅ | ❌ | ✅ |
| View HSO document | ✅ | ✅ (own advisees) | ✅ |
| View student list, case list, dashboard | ✅ (all) | ✅ (all, own highlighted) | ✅ (all) |
| Export reports (CSV/PDF) | ✅ | ✅ (own advisees) | ✅ |
| View audit log & login history | ✅ | ❌ | ✅ (matches original: PHEP and KJ only) |
| Submit feedback/complaint | ✅ | ✅ | ✅ |
| Manage feedback (resolve) | ✅ | ❌ | ❌ |
| Manage SOP documents | ✅ | ❌ | ❌ |

Enforce permissions in **three places**: UI (hide), server actions (check), and **Postgres RLS (authoritative)**.

---

## 5. Functional requirements

### 5.1 Authentication
- Email + password via Supabase Auth. No public sign-up; accounts are created only by PHEP (as in original).
- New user gets an invite email to set their password (no admin-chosen passwords like the original).
- Forgot-password flow via email (self-service; fixes "only PHEP can reset").
- After login, redirect to role dashboard (`/dashboard`, content varies by role).
- Session timeout after 30 min inactivity; logout clears session cookies.
- Optional: TOTP MFA enforced for PHEP accounts (Supabase MFA).
- Deactivated users cannot log in.

### 5.2 User management (PHEP)
- List users (name, email, role, classes advised, status, last login).
- Create user: name, email, staff ID (unique), role, phone (optional).
- Assign PA to one or more classes.
- Deactivate / reactivate (no hard delete).

### 5.3 Students
- Fields: matric number (unique, e.g. `03DDT19F2026` format), full name, programme, class/semester, phone, email, advisor (PA), verification status.
- PA adds students to their classes → status `pending`.
- PHEP verifies or rejects with a reason → PA sees rejection reason, edits, resubmits.
- Views: **card** and **table** toggle (kept from original), search by name/matric, filter by programme, class, quarantine status, verification status.
- Bulk import from CSV for PA (validate each row, show errors before commit). This directly replaces the old Excel workflow — highlight in README.

### 5.4 Quarantine cases
- Fields: student, case type (`positive` | `close_contact`), start date, end date (default start + 7 days, editable), HSO document (required), notes, verification status, outcome (`active` | `released` | `extended`), created by, verified by, timestamps.
- A student can have many cases over time (history).
- Only one **active** case per student at a time (DB constraint/check).
- **Derived status** replaces the original "refresh every 24 hours": a case is *active* if `today` is between start and end date and verified. Compute in a SQL view; additionally a daily `pg_cron` job marks expired cases `completed` and writes an audit entry.
- Views: **Latest** (currently active) and **History** (all), card/table toggle, filters: case type, date range, programme, class, status.
- PHEP verify page: queue of pending cases with HSO preview side-by-side, Verify / Reject (reason required).

### 5.5 HSO document upload
- Accept JPG, PNG, WEBP, PDF; max 5 MB.
- Validate MIME by **magic bytes** server-side, not just extension.
- Strip EXIF metadata from images before storing.
- Store in a **private** Supabase Storage bucket `hso-documents`, path `{student_id}/{case_id}/{uuid}.{ext}`.
- Serve only via short-lived signed URLs (60 s) generated server-side after permission check.

### 5.6 Dashboard & analytics (all roles)
KPI cards:
- Currently in quarantine (total, positive vs close contact)
- New cases today / this week
- Pending verifications (PHEP sees actionable count)
- Students released this week

Charts:
- Daily new cases (line, last 30/90 days)
- Active cases over time (area)
- Breakdown by programme / class (bar)
- Positive vs close-contact ratio (donut)
- Average quarantine duration

Tables:
- Students currently in quarantine, with return date (useful for lecturers: "who can't attend class")
- Classes with the most active cases

Filters: date range, programme, class. PA dashboard defaults to own advisees.

### 5.7 Reports & export
- Export current filtered list to CSV.
- Generate PDF "Daily Quarantine Status Report" (date, totals, per-class table, generated-by, timestamp) — this replaces PHEP's manual daily Excel merge.
- Export actions are written to the audit log.

### 5.8 Audit log
- Append-only table recording: actor, action (`create`, `update`, `verify`, `reject`, `delete`, `export`, `login`, `login_failed`, `role_change`), entity type, entity id, before/after JSON diff, timestamp, IP (hashed), user agent.
- Written by Postgres triggers for data changes (can't be bypassed by the app) and by server code for login/export.
- Viewer page for PHEP and KJ with filters (actor, action, date range).
- No UPDATE/DELETE allowed on this table for any role (RLS + revoke).

### 5.9 Feedback / complaints (original "Complaint" page)
- Any user submits: category (bug, suggestion, data issue), message, optional screenshot.
- PHEP views and marks `open` / `in_progress` / `resolved`.

### 5.10 SOP page
- PHEP uploads/updates SOP documents (title, description, PDF). Everyone can view.
- Seed with placeholder SOPs (clearly fictional).

### 5.11 Landing & about pages
- Public landing: what the system is, screenshots, "Try the demo" buttons per role, link to GitHub.
- About/Contact: original team credit (Azrul Hafiz bin Lateh, Hasif Haikal bin Abd Aziz, Mohamad Amirul Akhyar bin Azizan; supervisor Madam Zati Hanani binti Zainal, POLIMAS) + note that v2 is a solo remake.

### 5.12 Notifications & realtime
- In-app notification bell (Supabase Realtime): PA notified when their submission is verified/rejected or a student uploaded via link; PHEP notified of new pending items and new high-severity security alerts.
- Verify queue and dashboard KPIs update live without refresh (subscribe to changes on `students`, `quarantine_cases`).
- Daily email digest to PHEP (pending count, active cases, open alerts).

### 5.13 Demo mode
- `DEMO_MODE=true` shows a banner "Demo – all data is fictional".
- Landing page buttons log in as `demo-phep@`, `demo-pa@`, `demo-kj@` (credentials stored server-side, not exposed in client bundle).
- Demo users cannot change passwords, emails or create real users.
- Nightly job resets demo data to the seed state.
- Uploaded files in demo mode are deleted on reset.
- Seeded demo data includes a few pre-generated security alerts and a deliberately tampered audit-log copy (in a separate demo table) so visitors can see the integrity check fail and pass.

### 5.14 Insider-threat detection ("Security Insights")
Detect suspicious behaviour by **staff users** from the audit log. Explainable rules first, simple anomaly score second.

**Rules (each produces an alert with severity + plain-language explanation + evidence links):**
| ID | Rule | Default threshold | Severity |
|---|---|---|---|
| R1 | Repeated access-denied attempts: a PA tries to open records/HSO of students who are not their advisees (blocked by RLS, but the attempt is logged) | ≥ 3 in 1 h | High |
| R2 | Mass document access: user views > 20 HSO documents in 10 minutes | 20 / 10 min | Medium |
| R3 | Off-hours export: export between 00:00–06:00 MYT | any | Medium |
| R4 | Bulk export: > 3 exports or > 500 rows in 1 hour | 3 / 500 | Medium |
| R5 | Self-verification attempt blocked (four-eyes violation attempt) | any | High |
| R6 | Repeated failed logins then success from new device/IP | 5 fails → success | High |
| R7 | Privilege change: any role change or user reactivation | any | Low (info) |
| R8 | Unusual rejection/verification spike by one PHEP (> 3× their 30-day daily average) | 3× | Low |
| R9 | Edits to a verified record's history / deletion request on records created by the same person | any | Medium |
| R10 | Access from a new country/ASN for that user (from IP geolocation header on Vercel) | any | Medium |

**Anomaly score (per user per day):**
- Features: number of views, exports, rows exported, off-hours actions ratio, distinct students accessed, failed logins.
- Baseline: rolling 30-day mean and std per user; z-score per feature; overall score = max z (or weighted sum).
- Flag if score > 3; show **which feature(s) drove the score** (explainability) as a small bar chart: "Exports were 5.2× higher than this user's usual."
- Implementation: SQL views + scheduled job (pg_cron or Vercel Cron every 15 min) writing to `security_alerts`. Keep it simple and deterministic; no external ML service.

**UI (`/security`):**
- Alert list: severity badge, user, rule, time, status (`open` / `acknowledged` / `dismissed` / `escalated`), filter by severity/user/rule.
- Alert detail: explanation sentence, evidence timeline (the audit entries that triggered it), feature contribution chart, actions (acknowledge, dismiss with note, escalate).
- Per-user risk timeline: daily score sparkline.
- A user can never acknowledge/dismiss an alert about themselves.
- README section: "How this connects to my insider-threat research."

### 5.15 Tamper-evident audit log
- Each `audit_logs` row stores `prev_hash` and `hash = SHA-256(prev_hash || canonical_json(row_without_hash))`.
- Hash computed in the insert trigger (`pgcrypto` `digest()`), chained in insertion order (serialise with an advisory lock).
- "Verify integrity" button (PHEP/KJ) recomputes the chain server-side and reports: ✅ intact, or ❌ first broken entry id + timestamp.
- Daily job stores a signed **checkpoint** (latest hash + count + timestamp) in `audit_checkpoints`; optionally also posted to a GitHub Gist/commit so even a DB admin can't silently rewrite history.
- Document limitations honestly (a superuser could rewrite the whole chain; checkpoints mitigate).

### 5.16 Four-eyes controls
- A PHEP cannot verify/reject a student or case they created or last edited (DB trigger + UI disabled with tooltip). Blocked attempts are logged and trigger rule R5.
- Deleting (soft) a **verified** record requires a `deletion_request` with a reason, approved by a *different* PHEP or a KJ. Pending/rejected records can be soft-deleted by PHEP directly.
- Role changes and reactivations require a reason field and are flagged (R7).
- Seed **two PHEP users** so the flow can be demoed.

### 5.17 Student one-time upload link
- PA clicks "Request HSO from student" → system creates an `upload_links` row and shows/sends a link (`/u/[token]`), copy button + WhatsApp share button.
- Token: 32 random bytes, stored **hashed** (SHA-256); expires in 48 h; single use; bound to one student and one draft case.
- Public page shows only the student's first name and masked matric (`99DDT19F**26`), asks the student to confirm matric number, then upload HSO (same validation pipeline as 5.5) and enter positive/close-contact + dates.
- Creates the case as `pending`; PA reviews, then PHEP verifies as usual. Rate-limited; link revocable.

### 5.18 Return-to-class clearance letter
- When a verified case reaches end date or is released, PHEP (or PA request → PHEP) issues a clearance letter.
- PDF includes: student name, matric, class, quarantine period, issue date, issuer, letter number (`JTMKEQ/CL/2026/0001`), and a **QR code**.
- QR links to `/c/[token]` — public verification page showing only: valid/revoked/expired, masked name, class, cleared-from date. Token is HMAC-signed and stored hashed.
- Lecturers scan to confirm a student can return to class. Revocation supported (logged).

### 5.19 HSO OCR assist
- On upload, run Tesseract.js in a Web Worker on images (PDFs: render first page to image with pdf.js).
- Extract candidate name, IC/passport-like patterns (**discard, never store**), start/end dates.
- Pre-fill dates in the form; show a warning if extracted name doesn't fuzzy-match the student (e.g. similarity < 0.7) or dates differ from entered ones.
- OCR results stored as `ocr_summary jsonb` (dates, match score) — not raw text.
- Shown to PHEP in the verify queue as "OCR check: ✅ name match 0.92, dates match" or "⚠️ mismatch".
- Clearly labelled as an assist, never auto-verifies.

### 5.20 Privacy by design
- **Retention:** HSO files deleted automatically 30 days after a case is completed (configurable); case row keeps metadata + document hash. Daily job; deletion logged.
- **Field encryption:** student phone stored encrypted (AES-256-GCM, random IV per value); decrypted server-side only for users allowed to see it; masked in lists.
- **Masking:** matric numbers masked in public pages and exports for KJ (configurable).
- **Privacy notice** page and purpose statement on login (PDPA 2010).
- **Data export for a student record** (PHEP) to support access requests.

### 5.21 PWA & bilingual UI
- Installable PWA: manifest, icons, offline fallback page, cached app shell. No offline data writes (avoid sync conflicts) — show "You're offline" state.
- next-intl with `en` and `ms` message files; language switch in settings and landing page; dates/numbers localised.

---

## 6. Data model (Postgres)

Use UUID primary keys, `created_at`/`updated_at` timestamptz, soft delete via `deleted_at`.

```sql
-- Enums
create type user_role as enum ('phep', 'pa', 'kj');
create type verification_status as enum ('pending', 'verified', 'rejected');
create type case_type as enum ('positive', 'close_contact');
create type case_outcome as enum ('active', 'released', 'extended', 'completed');
create type feedback_status as enum ('open', 'in_progress', 'resolved');

-- Profiles (1:1 with auth.users)
profiles (
  id uuid pk references auth.users,
  full_name text not null,
  staff_id text unique not null,
  role user_role not null,
  phone text,
  is_active boolean default true,
  last_login_at timestamptz
)

programmes (id, code unique, name)              -- e.g. DDT, DIT, DNS
classes (id, programme_id fk, name, semester, session)  -- e.g. DDT5A, 2 2021/2022
class_advisors (class_id fk, advisor_id fk -> profiles, pk(class_id, advisor_id))

students (
  id, matric_no text unique not null,
  full_name, email, phone_encrypted text, phone_last4 text,
  class_id fk, advisor_id fk -> profiles,
  verification verification_status default 'pending',
  rejection_reason text,
  verified_by fk -> profiles, verified_at,
  created_by fk -> profiles, deleted_at
)

quarantine_cases (
  id, student_id fk,
  type case_type not null,
  start_date date not null, end_date date not null check (end_date >= start_date),
  outcome case_outcome default 'active',
  notes text,
  verification verification_status default 'pending',
  rejection_reason text,
  verified_by, verified_at, created_by, deleted_at
)
-- partial unique index: one non-deleted active verified case per student

case_documents (
  id, case_id fk, storage_path text null,   -- null after retention purge
  mime_type, size_bytes, sha256, uploaded_by, uploaded_via text, -- 'pa' | 'student_link'
  ocr_summary jsonb, purged_at timestamptz
)

audit_logs (
  id bigserial, actor_id, action text, entity_type text, entity_id uuid,
  before jsonb, after jsonb, ip_hash text, user_agent text, country text,
  outcome text,             -- 'success' | 'denied'
  prev_hash text, hash text not null,
  created_at
)
audit_checkpoints (id, last_log_id, last_hash, row_count, signature, created_at)

security_alerts (
  id, rule_id text, severity text, subject_user_id fk, score numeric,
  explanation text, feature_contributions jsonb, evidence_log_ids bigint[],
  status text default 'open', handled_by fk, handled_note text, created_at
)
user_daily_activity (user_id, day date, views int, exports int, rows_exported int,
  off_hours_ratio numeric, distinct_students int, failed_logins int, denied int,
  pk(user_id, day))         -- materialised by scheduled job, feeds anomaly score

deletion_requests (
  id, entity_type, entity_id, reason text, requested_by fk,
  status text default 'pending', decided_by fk, decided_at,
  check (decided_by is null or decided_by <> requested_by)
)

upload_links (
  id, token_hash text unique, student_id fk, case_id fk null, created_by fk,
  expires_at, used_at, revoked_at
)

clearance_letters (
  id, letter_no text unique, case_id fk, token_hash text unique,
  issued_by fk, issued_at, revoked_at, revoked_reason, pdf_path
)

feedback (id, author_id, category, message, attachment_path, status feedback_status, resolved_by, created_at)

sop_documents (id, title, description, storage_path, published boolean, updated_by)

notifications (id, recipient_id, title, body, link, read_at, created_at)
```

Views:
- `v_active_cases` — verified, not deleted, `current_date between start_date and end_date`.
- `v_dashboard_daily` — counts per day for charts.
- `v_class_summary` — active counts per class/programme.

Migrations live in `supabase/migrations/`; seed in `supabase/seed.sql`.

---

## 7. Row-Level Security (summary)

Enable RLS on every table. Helper: `auth_role()` returns current user's role from `profiles`; `is_advisor_of(student_id)`.

- `profiles`: everyone reads active profiles' name/role; only PHEP inserts/updates; users update own phone only.
- `students`: all authenticated read non-deleted; PA insert where `advisor_id = auth.uid()`; PA update own rows only while `verification <> 'verified'`; PHEP update all; nobody hard-deletes.
- `quarantine_cases`: same pattern via the student's advisor.
- `case_documents` + storage bucket policies: read if PHEP/KJ or advisor of the student; insert only by advisor.
- `audit_logs`, `audit_checkpoints`: select for PHEP/KJ; no insert/update/delete from clients (triggers use `security definer`); `update`/`delete` revoked even for the service role where possible.
- `security_alerts`: select/update for PHEP/KJ, but update blocked when `subject_user_id = auth.uid()`.
- `deletion_requests`: PHEP insert; PHEP (not requester) or KJ decide.
- `upload_links`, `clearance_letters`: managed via server actions only; public pages use server-side lookups by token hash with the service role, returning only the minimal fields.
- Verification columns (`verification`, `verified_by`, `verified_at`) can only be changed by PHEP — enforce with a trigger that rejects changes from other roles.

**Write SQL tests proving each policy** (e.g. PA cannot read another PA's HSO, KJ cannot insert, PA cannot set `verification='verified'`).

---

## 8. Security requirements (headline section of README)

Map these to OWASP Top 10 in the README.

1. **Access control:** RLS on all tables + server-side checks; no client-trusted role.
2. **Authentication:** Supabase Auth (bcrypt), min 10-char password, leaked-password check if available, rate limit login (5 attempts / 15 min per IP+email), generic error messages, MFA for PHEP.
3. **Input validation:** Zod on every server action; parameterised queries only (Supabase client); length limits on all text.
4. **XSS:** no `dangerouslySetInnerHTML`; strict Content-Security-Policy with nonces.
5. **Security headers:** CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors none.
6. **File upload:** magic-byte check, size limit, EXIF strip, private bucket, signed URLs, random filenames, SHA-256 stored for integrity.
7. **Secrets:** service-role key server-only (`import 'server-only'`); `.env*` gitignored; GitHub secret scanning on.
8. **Audit & accountability:** trigger-based append-only audit log; login success/failure logged.
9. **Privacy (Malaysia PDPA 2010 mindset):** data minimisation (no IC number, no home address), purpose notice on login page, retention note (cases older than X can be archived), demo uses fictional data only.
10. **Dependencies:** Dependabot + `pnpm audit` in CI.
11. **CSRF:** Server Actions' built-in origin check; SameSite cookies.
12. **Integrity:** hash-chained audit log + checkpoints (5.15); four-eyes approvals (5.16); signed clearance tokens (5.18).
13. **Insider-threat monitoring:** rules + anomaly scoring (5.14); denied-access attempts logged.
14. **Public token endpoints** (`/u/[token]`, `/c/[token]`): tokens hashed at rest, constant-time compare, rate limited, `noindex`, minimal data returned, masked identifiers.
15. **Data protection:** field encryption + retention purge (5.20).

Deliverables:
- `SECURITY.md` — threat model (STRIDE table; actors: outsider, curious PA, malicious insider PHEP, compromised account), controls mapped to OWASP Top 10, known limitations, how to report issues.
- `docs/pentest.md` — self-assessment report:
  - Scope, method, tools (OWASP ZAP baseline + active scan against a staging deploy, Burp Community optional, manual tests).
  - Manual test cases: IDOR on `/students/[id]`, `/cases/[id]` and signed URLs; vertical privilege escalation PA→PHEP via direct server-action calls; horizontal escalation PA→PA; file-upload bypass (polyglot, double extension, SVG, oversized, wrong magic bytes); XSS in notes/feedback; CSV/formula injection in exports (prefix `=,+,-,@` cells); brute force & rate limit; token guessing/replay on upload and clearance links; audit-log tampering via SQL; session fixation/logout.
  - Findings table (ID, severity CVSS-style, description, evidence, fix, retest result) — include real issues found and fixed during the build.
  - ZAP reports attached in `docs/zap/`.

---

## 9. Pages & routes

```
/                         Public landing (demo buttons)
/login                    Login
/forgot-password          Reset request
/reset-password           Set new password
/dashboard                Role-aware dashboard
/students                 List (card/table), search, filter
/students/new             Add student (PA)
/students/import          CSV import (PA)
/students/[id]            Detail: profile + case history timeline
/students/[id]/edit
/cases                    Quarantine list: ?view=latest|history&layout=card|table
/cases/new                Add case + HSO upload (PA)
/cases/[id]               Detail with HSO viewer
/verify                   PHEP queue: tabs Students | Cases
/reports                  Filters + CSV/PDF export
/admin/users              User management (PHEP)
/admin/classes            Programmes, classes, advisor assignment (PHEP)
/audit                    Audit log + login history (PHEP, KJ)
/feedback                 Submit + list (PHEP manages)
/sop                      SOP documents
/about                    Original team credit, project story
/settings                 Profile, password, MFA, theme, language
/security                 Security Insights: alerts, user risk timelines (PHEP, KJ)
/security/alerts/[id]     Alert detail with evidence + explanation
/audit/integrity          Hash-chain verification result
/approvals                Deletion requests awaiting four-eyes approval
/clearance                Issued clearance letters (list, issue, revoke)
/u/[token]                Public: student one-time HSO upload
/c/[token]                Public: clearance letter verification (QR target)
/privacy                  Privacy notice (PDPA)
/status                   Link to uptime status page
```

Layout: sidebar navigation (collapsible; bottom nav or sheet on mobile), top bar with notifications, user menu, theme toggle.

---

## 10. UI / UX requirements

- Mobile-first, works from 360 px width upwards.
- WCAG 2.2 AA: keyboard navigable, visible focus, contrast, labelled form fields, aria-live for toasts.
- Clean, modern institutional look (not a copy of the 2022 design). Neutral base, one accent colour; status colours: positive = red, close contact = amber, released = green, pending = slate.
- Empty states, loading skeletons, error boundaries on every page.
- Toast feedback for every action; confirm dialogs for verify/reject/deactivate.
- Dates in `DD MMM YYYY`, timezone Asia/Kuala_Lumpur.
- Language: English default with Bahasa Melayu toggle (see 5.21).

---

## 11. Non-functional requirements (measurable)

| Requirement | Target | How verified |
|---|---|---|
| Performance | Lighthouse Performance ≥ 90, LCP < 2.5 s on landing & dashboard | Lighthouse CI in GitHub Actions |
| Accessibility | Lighthouse a11y ≥ 95, zero axe critical issues | Playwright + axe |
| Reliability | All E2E tests green on main | CI |
| Security | All RLS tests pass; securityheaders.com grade A | CI + manual |
| Code quality | TypeScript strict, ESLint clean, no `any` without comment | CI |
| Coverage | ≥ 70% on `lib/` (validation, permissions, date logic, detection rules, hash chain) | Vitest coverage |
| Load | 100 virtual users for 5 min on dashboard + list + case creation: p95 < 800 ms, error rate < 1% (on free tiers; document limits) | k6 scripts in `k6/`, results in `docs/load-test.md` |
| Observability | 100% of server errors captured in Sentry with release + user role tag (no PII); uptime monitor every 5 min; public status page | Sentry + uptime service |
| Detection quality | Every rule R1–R10 has a test that triggers it and a test that doesn't; seeded scenario produces expected alerts | Vitest + seed scenario |

(Replaces the original unmeasured "10,000 concurrent users / 0.3 s" claims with real, verifiable numbers. Publish k6 and Lighthouse results in the README.)

---

## 12. Seed data (fictional only)

- 3 programmes (e.g. DDT, DIT, DNS), 9 classes.
- Users: 2 PHEP (for four-eyes), 6 PAs, 1 KJ + the 3 demo accounts.
- 90 days of synthetic audit/activity history so anomaly baselines exist, including one scripted "suspicious PA" and one "suspicious PHEP" scenario that produce alerts.
- A few issued clearance letters (one revoked) and one expired upload link.
- ~180 students with generated Malaysian-style names and matric numbers in the `03DDT19F####` pattern (**must not match real students** — use a fake prefix like `99`).
- ~120 quarantine cases spread over the last 90 days with realistic waves; mix of pending, verified, rejected; some active today.
- Placeholder HSO images clearly watermarked "SAMPLE – NOT REAL".
- A few feedback items and SOP docs.

Provide `pnpm db:seed` and `pnpm db:reset`.

---

## 13. Testing plan

**Unit (Vitest):** Zod schemas, date/status derivation, permission helpers, CSV import parser, CSV formula escaping, file-type sniffing, detection rules R1–R10, anomaly z-score + feature contributions, hash-chain compute/verify, field encryption round-trip, token generation/hash/expiry, OCR date/name parsing and fuzzy match.

**RLS/DB tests:** one test per policy rule in Section 7, run against local Supabase.

**E2E (Playwright), one suite per role:**
1. Login redirects correctly; deactivated user blocked; rate limit triggers.
2. PHEP creates PA → PA receives invite (mock) → PA logs in.
3. PA adds student → PHEP rejects with reason → PA edits & resubmits → PHEP verifies.
4. PA adds case with HSO → PHEP previews and verifies → appears in Latest list and dashboard counts.
5. PA cannot open another PA's case/HSO URL (expect 403/404).
6. KJ can view everything, cannot see any create/verify buttons, direct POST rejected.
7. Search & filter on student and case lists (card and table).
8. CSV import with bad rows shows errors.
9. Export CSV/PDF downloads and audit entry is created.
10. Mobile viewport smoke test of main pages.
11. PHEP cannot verify own record (button disabled; direct call rejected; alert R5 created).
12. Deletion of verified case: PHEP A requests → PHEP A cannot approve → PHEP B approves → record hidden, audit entry exists.
13. Audit integrity: verify passes; after a test-only DB tamper, verify reports the exact broken entry.
14. Insider scenario: scripted "malicious PA" does mass views + off-hours export → alerts R2, R3 appear with explanations.
15. Student upload link: PA creates → student uploads → link cannot be reused → expired link rejected.
16. Clearance letter: issue → scan QR URL shows valid → revoke → shows revoked.
17. OCR: sample HSO pre-fills dates; mismatched name shows warning.
18. Realtime: PA submits in one browser context, PHEP queue updates in another without reload.
19. Retention job purges HSO file after threshold; case metadata + hash remain.
20. Language switch to BM renders translated UI; PWA manifest valid.

**Security testing:** ZAP baseline scan in CI on preview deploys (fail on High); full manual pentest before launch (Section 8 deliverable).

**Load testing:** k6 smoke test in CI (low VUs); full run manually against staging, results committed.

**UAT:** short Google Form questionnaire + 3–5 real testers (friends/lecturers) using demo accounts; record results in `docs/uat.md`. This fixes the original "sole tester" weakness.

---

## 14. Build phases

**Phase 0 — Setup**
- Init Next.js + TS + Tailwind + shadcn, ESLint, Prettier, Vitest, Playwright.
- Supabase project + local CLI, migrations folder, typed client generation (`supabase gen types`).
- GitHub repo, CI workflow (lint, typecheck, test), Vercel deployment of a hello page.
- ✅ Done when: CI green, preview URL live.

**Phase 1 — Auth & roles**
- profiles table, RLS, login/logout/forgot/reset, role-based redirect, middleware protecting routes, app shell layout.
- ✅ Done when: three seeded users log in and see role-specific nav.

**Phase 2 — Students**
- programmes/classes/advisors, students CRUD, verify/reject, card/table list with search & filter, detail page, CSV import.

**Phase 3 — Quarantine cases & HSO**
- cases CRUD, storage bucket + policies, secure upload pipeline, verify queue with preview, latest/history views, derived status view, daily cron.

**Phase 4 — Dashboard & reports**
- KPI cards, charts, filters, CSV (with formula-injection escaping) + PDF export.

**Phase 5 — Audit, integrity, admin, feedback, SOP**
- Audit triggers with hash chain + checkpoints + integrity check page, login history, user management, four-eyes rules and deletion approvals, feedback, SOP pages.

**Phase 6 — Insider-threat detection**
- `user_daily_activity` job, rules R1–R10, anomaly z-score with feature contributions, `/security` pages, alert actions, seeded scenarios, tests per rule.

**Phase 7 — Student & lecturer features**
- One-time student upload links, clearance letters with QR + public verification page, OCR assist in upload and verify queue.

**Phase 8 — Realtime, privacy, PWA, i18n**
- Realtime verify queue/dashboard/notifications, daily digest, field encryption, retention purge job, masking, privacy page, PWA, BM/EN.

**Phase 9 — Polish, demo, observability**
- Demo mode + nightly reset, landing + about pages, dark mode, empty/loading/error states, a11y pass, security headers/CSP, Sentry, uptime monitor + status page.
- Keep-alive: GitHub Actions cron pings `/api/health` every few days so the Supabase free project isn't paused.

**Phase 10 — Hardening & launch**
- Full E2E suite, RLS tests, Lighthouse CI, ZAP scans, manual pentest + `docs/pentest.md`, k6 load test + `docs/load-test.md`, UAT, README/SECURITY/ADRs/CHANGELOG, screenshots, demo video, LinkedIn post.

**Scope guard:** Phases 0–5 are the MVP and should be deployed and usable before starting Phase 6. If time runs short, ship MVP + Phase 6 (the headline feature) first.

---

## 15. Repo structure

```
jtmkeq/
├─ app/
│  ├─ (public)/            landing, login, about
│  ├─ (app)/               authenticated routes + layout
│  └─ api/health/route.ts
├─ components/             ui/ (shadcn), charts/, tables/, forms/
├─ lib/
│  ├─ supabase/            server.ts, client.ts, middleware.ts
│  ├─ validation/          zod schemas
│  ├─ auth/                permission helpers
│  └─ utils/
├─ supabase/
│  ├─ migrations/
│  ├─ seed.sql
│  └─ tests/               RLS tests
├─ tests/
│  ├─ unit/
│  └─ e2e/
├─ lib/detection/          rules, anomaly scoring, explanations (pure, unit-tested)
├─ lib/crypto/             field encryption, token hashing, hash chain helpers
├─ messages/               en.json, ms.json
├─ k6/                     load test scripts
├─ docs/
│  ├─ architecture.md      diagram (Mermaid): Next.js ↔ Supabase, data flow
│  ├─ erd.md               Mermaid ERD
│  ├─ original-vs-v2.md    comparison with 2022 system
│  ├─ insider-threat.md    rules, scoring method, explainability, limitations
│  ├─ pentest.md           self-assessment report
│  ├─ zap/                 ZAP scan reports
│  ├─ load-test.md         k6 results
│  ├─ uat.md
│  └─ adr/                 0001-use-supabase.md, 0002-rls-as-authorisation.md,
│                          0003-hash-chained-audit-log.md, 0004-rule-based-detection.md, ...
├─ .github/workflows/      ci.yml, lighthouse.yml, zap.yml, k6-smoke.yml, keepalive.yml
├─ docker-compose.yml
├─ Makefile                (or pnpm scripts) `make dev`, `make test`, `make seed`
├─ CHANGELOG.md
├─ README.md
├─ SECURITY.md
└─ .env.example
```

---

## 15b. Engineering practices

- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `security:`); small commits per task.
- **Branches + PRs** for each phase, even solo, with a short PR description and checklist — shows real workflow on GitHub.
- **ADRs** for every significant decision (short: context, decision, consequences).
- **CHANGELOG.md** following Keep a Changelog; tag releases `v2.0.0-mvp`, `v2.1.0`, etc.
- **One-command local setup:** `docker compose up` (or `make dev`) starts Supabase locally (via CLI), applies migrations, seeds data and runs the Next.js dev server. README "Quick start" must work on a fresh machine in under 10 minutes.
- **Dependabot** + Renovate-style grouped updates; GitHub secret scanning + push protection enabled.
- **Issue templates** for bug and feature; GitHub Projects board mirroring the phases.

---

## 15c. Skills to use per phase

Load the listed skill(s) with the Skill tool **at the start of each step**. If a skill isn't installed, tell me which plugin is missing instead of skipping it.

**Before Phase 0 (one-time, in this order)**
1. `superpowers:brainstorming` — pressure-test this spec; list gaps/questions for me before building.
2. `agent-skills:constraint-driven-development` — turn Section 11 targets into `CONSTRAINTS.md` and enforce them for the rest of the build (no lowered thresholds, skipped tests, or new suppressions).
3. `impeccable:impeccable` — establish the design direction and produce `DESIGN.md` (palette, typography, spacing, radius, status colours for positive / close contact / released / pending, light + dark, chart colours). Every later UI task follows it.
4. `superpowers:writing-plans` / `agent-skills:planning-and-task-breakdown` — break Phase 0–1 into tasks with acceptance criteria.

**Every phase (standard loop)**
- Plan: `agent-skills:planning-and-task-breakdown`
- Build: `agent-skills:incremental-implementation` + `superpowers:test-driven-development`; use `superpowers:subagent-driven-development` for independent tasks.
- Docs check: `agent-skills:source-driven-development` for any Next.js / Supabase / library API.
- Bugs: `superpowers:systematic-debugging`.
- Before marking done: `superpowers:verification-before-completion` → `agent-skills:code-review-and-quality` (or `superpowers:requesting-code-review`) → `agent-skills:git-workflow-and-versioning` for commit/PR.

**Phase-specific**
| Phase | Skills |
|---|---|
| 0 Setup | `agent-skills:ci-cd-and-automation`, `agent-skills:git-workflow-and-versioning` |
| 1 Auth & roles | `agent-skills:security-and-hardening`, `agent-skills:api-and-interface-design`, `impeccable:impeccable` (app shell, login) |
| 2 Students | `impeccable:impeccable` (lists, cards/table, forms), `stitch-build:shadcn-ui`, `agent-skills:frontend-ui-engineering` |
| 3 Cases & HSO | `agent-skills:security-and-hardening` (upload pipeline, storage policies), `agent-skills:doubt-driven-development` (RLS + signed URLs), `impeccable:impeccable` (verify queue) |
| 4 Dashboard & reports | `dataviz`, `dataink:dashboard-design`, `impeccable:impeccable` |
| 5 Audit, integrity, admin | `agent-skills:doubt-driven-development` (hash chain, four-eyes triggers), `agent-skills:security-and-hardening` |
| 6 Insider-threat detection | `superpowers:test-driven-development` (one test per rule), `agent-skills:doubt-driven-development` (false positives/negatives), `dataviz` (explanation charts), `impeccable:impeccable` (Security Insights UI) |
| 7 Student & lecturer features | `agent-skills:security-and-hardening` (public token pages), `impeccable:impeccable` (public upload + verification pages, clearance PDF look) |
| 8 Realtime, privacy, PWA, i18n | `agent-skills:security-and-hardening` (encryption, retention), `agent-skills:performance-optimization` |
| 9 Polish & observability | `impeccable:impeccable` (critique → audit → polish → animate), agents `impeccable:impeccable-finish-reviewer` and `impeccable:impeccable-motion-reviewer`, `agent-skills:accessibility-engineering`, `agent-skills:observability-and-instrumentation` |
| 10 Hardening & launch | agent `agent-skills:security-auditor`, `agent-skills:webperf` / `performance-optimization`, `agent-skills:documentation-and-adrs`, agent `impeccable:impeccable-documenter` (final `DESIGN.md`), `agent-skills:shipping-and-launch` (go/no-go) |

**After launch (portfolio)**
- `social-media-skills:linkedin-post-writer` — launch post.
- `social-media-skills:carousel-writer` — optional "2022 vs 2026" carousel.
- `anthropic-skills:video-making` or `social-media-skills:descript` — 60–90 s demo video.

---

## 16. Portfolio deliverables (for LinkedIn)

- **README** with: one-line pitch, live demo link + demo role buttons, GIF of main flow, features, tech stack badges, architecture diagram, ERD, security section (OWASP mapping), insider-threat section, "Original (2022) vs v2" comparison table, quick start, test/Lighthouse/k6 results, pentest summary, status badge, credits to original team.
- **Screenshots:** landing, dashboard (light + dark), verify queue with HSO preview + OCR check, Security Insights alert with explanation chart, audit integrity check, clearance letter + QR verification page, mobile/PWA view, BM language view.
- **60–90 s demo video:** student uploads via link → PHEP verifies (live update) → dashboard updates → clearance letter scanned → suspicious PA triggers an explained alert → integrity check.
- **Optional write-up:** short blog/LinkedIn article "Rebuilding my diploma project with security-first engineering" summarising pentest findings and what changed.
- **LinkedIn post** (draft at the end): problem → what I rebuilt → security highlights → what I learned → links. Tag/credit original teammates and supervisor.

---

## 17. Acceptance criteria (definition of done)

- [ ] All Section 5 features (5.1–5.21) implemented.
- [ ] Rules R1–R10 and anomaly scoring produce explained alerts; seeded scenarios demo them.
- [ ] Audit hash chain verifies; tamper demo detects the broken entry.
- [ ] Four-eyes rules enforced in DB, not just UI.
- [ ] Upload links and clearance tokens are single-purpose, hashed, expiring/revocable.
- [ ] HSO files purged per retention; phone numbers encrypted at rest.
- [ ] Pentest report, ZAP reports, k6 results and ADRs committed.
- [ ] Sentry and uptime monitoring live; `docker compose up` quick start works.
- [ ] Every permission in Section 4 enforced by RLS and covered by a test.
- [ ] HSO files inaccessible without a valid signed URL issued after a permission check.
- [ ] Audit log records every create/update/verify/reject/delete/export/login.
- [ ] Responsive at 360 px, 768 px, 1280 px; no horizontal scroll.
- [ ] Lighthouse & a11y targets met (Section 11).
- [ ] CI green; deployed to Vercel with demo mode on.
- [ ] README, SECURITY.md, docs/ complete; no secrets in git history.
- [ ] Only fictional data anywhere in the repo or demo.

---

## 18. Suggested first prompt for Claude Code

> Read `SPEC.md` fully. First do the "Before Phase 0" steps in Section 15c (brainstorming → CONSTRAINTS.md → Impeccable `DESIGN.md` → plan) and show me the questions, constraints and design direction for approval. Then start **Phase 0** only: scaffold the project, set up tooling, Supabase local dev, CI and a Vercel-ready hello page. Show me the plan for Phase 0 before running commands, then implement, run checks, and commit. Stop at the end of Phase 0 and summarise what's done and what I need to do manually (e.g. create Supabase project, add env vars in Vercel).
