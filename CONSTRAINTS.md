# Constraints

Last reviewed: 2026-11-21 (initial, from SPEC.md §11). Owner: project author.

Read this file before writing code. **Do not weaken it to make a change pass.** Tightening is silent; loosening needs an explicit owner decision recorded in this file's history.

Failure policy: **block.** A failing check at task end means the task is not done. Fast loop budget: ≤ 90 s at task end; CI unlimited.

## Floor (always enforced)

- No new suppression comments: `@ts-ignore`, `@ts-expect-error` without a reason, `eslint-disable`, `istanbul ignore`/`v8 ignore`, `nosemgrep`, `gitleaks:allow`.
- No `any` without an adjacent `// reason:` comment (SPEC §11).
- No unimplemented stubs: `throw new Error("Not implemented")`, empty `catch {}`, `TODO` standing in for logic.
- No skipped (`.skip`, `.only`, `test.fixme`) or deleted tests without a reason in the commit message.
- No secrets in source or git history; `.env*` gitignored except `.env.example`.
- No `dangerouslySetInnerHTML` (SPEC §8.4).
- `SUPABASE_SERVICE_ROLE_KEY` and other server secrets only imported from modules that `import 'server-only'`.
- Only fictional data in the repo (matric prefix `99`, fake names, watermarked sample HSO images).
- Every new table has RLS enabled in the same migration that creates it.

## Enforced with numbers

| Dimension | Rule | Why | Checked by | Runs at | From phase |
|---|---|---|---|---|---|
| Types | Zero errors, `strict: true` | SPEC §11 code quality | `pnpm typecheck` (`tsc --noEmit`) | task end, CI | 0 |
| Lint | Zero errors, zero warnings | SPEC §11 | `pnpm lint` (ESLint, `--max-warnings=0`) | task end, CI | 0 |
| Format | No diff | Consistency | `pnpm format:check` (Prettier) | task end, CI | 0 |
| Unit tests | All pass | SPEC §11 reliability | `pnpm test` (Vitest) | task end, CI | 0 |
| Coverage | `lib/**` ≥ 70% lines/branches/functions | SPEC §11 | `pnpm test:coverage` (Vitest v8 thresholds in `vitest.config.mts`) | CI | 1 |
| RLS / DB | All pgTAP tests pass; one test per §7 policy | SPEC §7, §11 | `supabase test db` on CI runner | CI | 1 |
| E2E | All Playwright tests pass on main | SPEC §11 | `pnpm test:e2e` | CI | 1 |
| Accessibility | Zero axe critical/serious; Lighthouse a11y ≥ 95 | SPEC §11 (external check) | `@axe-core/playwright` in E2E; Lighthouse CI | CI / preview | 1 (axe), 9 (LHCI) |
| Performance | Lighthouse perf ≥ 90; LCP < 2500 ms on `/` and `/dashboard` | SPEC §11, CWV "good" (external) | Lighthouse CI (`lighthouse.yml`) | preview deploy | 4 |
| Secrets | No findings | SPEC §8.7 (external) | `gitleaks` action, `--redact` | CI | 0 |
| Dependencies | No `high`/`critical` advisories | SPEC §8.10 (external) | `pnpm audit --audit-level=high` | CI | 0 |
| Security headers | securityheaders.com grade A | SPEC §11 (external) | manual + header unit test | preview | 9 |
| ZAP | Baseline scan: no High | SPEC §13 (external) | `zap.yml` against preview | preview | 10 |
| Load | 100 VUs × 5 min: p95 < 800 ms, errors < 1% | SPEC §11 (external) | `k6 run k6/*.js` (smoke in CI, full manual) | CI smoke / manual | 10 |
| Detection | Each rule R1–R10 has a firing and a non-firing test | SPEC §11 | Vitest `tests/unit/detection/*` | CI | 6 |
| Responsive | No horizontal scroll at 360/768/1280 px | SPEC §17 | Playwright viewport test | CI | 1 |

A row only counts as enforced from its phase onward; before that it is a commitment, not a gate. When a row goes live, run it once against a deliberate violation to prove it fails.

## Measured, not yet enforced

| Metric | Today | Direction |
|---|---|---|
| Client JS on `/` (first load) | not measured (no code yet) | record at Phase 0, must not grow > 10% without a reason |
| Project-wide coverage (outside `lib/`) | n/a | must not fall once recorded |

## Exceptions

| ID | Rule | Path | Reason | Owner | Expires |
|---|---|---|---|---|---|
| — | none | | | | |

## Environment-driven notes
- No local Docker (owner decision). DB/RLS tests run only in CI (ephemeral `supabase start` on GitHub runner). Locally, the fast loop is typecheck + lint + format + unit tests.
