# DESIGN.md — JTMK e-Quarantine v2

Status: **pre-build direction** (chosen 2026-11-21: *Wayfinding*). Required by SPEC §15c before Phase 0. Tokens below are binding for all UI work; after Phase 9 the `impeccable-documenter` agent refreshes this file from the shipped build. Direction contract lives in `.impeccable/surfaces/app-app-layout-tsx.md`.

## 1. Idea

Every case is a journey with a known exit. The staff app reads like a well-signed Malaysian road: a solid sign-green field holds navigation, white legible type, plates that tell you exactly how far it is to the destination (back to class). Calm, official-feeling, never alarming, never a template.

What the world lends (and only this): **type, palette, density, one signature move**. Layout, navigation and controls stay standard web patterns (shadcn/ui primitives restyled).

## 2. Colour

Strategy: **Committed shell + semantic status.** Green owns whole regions (rail, mobile header, primary actions); the work ground stays cool sign-white so data reads first.

### Light (default)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F3F6F4` | page ground |
| `--surface` | `#FFFFFF` | tables, panels, inputs |
| `--surface-2` | `#EAF0EC` | table header, hover, subtle fills |
| `--border` | `#D5DED8` | panel borders, table header rule |
| `--border-subtle` | `#E6ECE8` | row hairlines |
| `--fg` | `#10201A` | primary text |
| `--fg-muted` | `#3D4D45` | secondary text, labels |
| `--fg-subtle` | `#5E6E66` | hints, placeholders (≥ 4.5:1 on white) |
| `--rail` | `#0E5A3A` | sign green: rail, mobile header, KPI plate edge |
| `--rail-fg` | `#FFFFFF` | text on rail (≈ 7.9:1) |
| `--rail-active-bg` / `-fg` | `#FFFFFF` / `#0E5A3A` | current nav item (inverted plate) |
| `--primary` / `-fg` / `-hover` | `#0E5A3A` / `#FFFFFF` / `#0A4A2F` | primary buttons |
| `--info` | `#1F4E9A` | links, info, focus ring on light |
| `--badge` / `-fg` | `#F2C230` / `#10201A` | nav count badges, "new/changed" marker |
| `--destructive` | `#B4271F` | destructive buttons (reject, deactivate) |
| `--ring` | `#1F4E9A` (on rail: `#F2C230`) | 2px focus ring, 2px offset |

### Dark

| Token | Value |
|---|---|
| `--bg` | `#0C1411` |
| `--surface` | `#121C18` |
| `--surface-2` | `#18241F` |
| `--border` / `--border-subtle` | `#2A3A33` / `#1F2C26` |
| `--fg` / `--fg-muted` / `--fg-subtle` | `#E8EFEA` / `#A9B8B0` / `#8A9A92` |
| `--rail` / `--rail-fg` | `#0D4D33` / `#FFFFFF` |
| `--rail-active-bg` / `-fg` | `#FFFFFF` / `#0D4D33` |
| `--destructive-fg` | `#1A0B0A` (white on `#E5534B` is ~3.6:1, fails AA) |
| `--primary` / `-fg` / `-hover` | `#3DBE85` / `#04110B` / `#55CC97` |
| `--info` | `#7FA8F0` |
| `--badge` / `-fg` | `#F2C230` / `#10201A` |
| `--destructive` | `#E5534B` |
| `--ring` | `#7FA8F0` |

Dark mode is a scene for evening/late admin work: rail darkens but stays green; ground goes deep green-black, never pure black.

### Status colours (SPEC §10)

Each status has `solid` (dots, chart marks, chip edge), `soft` (chip fill) and `fg` (chip text, ≥ 4.5:1 on soft). **Status is never colour-only:** every chip carries a text label, and an icon or pattern.

| Status | solid | soft (light / dark) | fg (light / dark) | Non-colour cue |
|---|---|---|---|---|
| Positive | `#C8322B` | `#FBE8E6` / `#3A1714` | `#8F1F19` / `#F5A39D` | `Biohazard`-free: lucide `Circle` filled dot + "Positive" |
| Close contact | `#D98A0B` | `#FCF0D9` / `#3A2A0C` | `#7A4A00` / `#F3C46E` | lucide `CircleDot` + "Close contact" |
| Released / cleared | `#2F9E5C` | `#E2F4E9` / `#12301F` | `#17663A` / `#8ADBA9` | lucide `Check` + "Released" |
| Pending | `#5B6573` | hatch over `#EEF0F3` / `#1E242B` | `#3A424D` / `#C3CAD3` | **diagonal hatch** (`repeating-linear-gradient(135deg, …)`) + "Pending" |
| Rejected | `#B4271F` | transparent, 1px solid border | `#8F1F19` / `#F5A39D` | lucide `X` + "Rejected" (outline chip) |
| Verified | `--rail` | `#E2EFE8` / `#123326` | `#0E5A3A` / `#8ADBA9` | lucide `BadgeCheck` + "Verified" |

Known risk: rail green and released green are neighbours. Released always uses the brighter `#2F9E5C` + check icon; never use rail green for status.

Alert severity (Security Insights): High = positive red, Medium = amber, Low/info = `--info`; plus a fixed **size ramp** for severity dots (12 / 9 / 6 px) so severity reads without colour.

### Chart colours

Categorical (programmes, classes), drawn from the Malaysian sign family; validated distinct in both themes:

| # | Light | Dark | Name |
|---|---|---|---|
| 1 | `#0E5A3A` | `#3DBE85` | route green |
| 2 | `#1F4E9A` | `#7FA8F0` | expressway blue |
| 3 | `#B8860B` | `#E8C25A` | warning yellow (darkened for marks on white) |
| 4 | `#7A4A1E` | `#C9915C` | tourist-sign brown |
| 5 | `#0F7C8C` | `#5CC4D2` | teal |
| 6 | `#6B7A72` | `#A9B8B0` | sign grey (other) |

Case-type series always use status solids (positive red, close-contact amber). Gridlines `--border-subtle`, axis text `--fg-muted` 12px. Max 6 categories; group the rest as "Other".

## 3. Typography

One family carries everything (raise from *design annual*).

- **Overpass** (Google Fonts; open-source, Highway Gothic lineage) — 400, 600, 700, 800.
- **Overpass Mono** — 500, 600 — matric numbers, dates, counts, reference numbers, tabular figures.
- Load via `next/font/google`, `display: swap`, subsets `latin`, `latin-ext`.
- Sign-style labels: 12px, 700, uppercase, `letter-spacing: 0.08em`.

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `text-display` | 40 / 44 | 800 | KPI numbers |
| `text-h1` | 28 / 34 (mobile 22 / 28) | 800 | page title |
| `text-h2` | 18 / 24 | 800 | section / panel title |
| `text-body` | 15 / 22 (mobile 16 / 24) | 400 | body, form text |
| `text-table` | 14 / 20 | 400 | table cells |
| `text-small` | 13 / 18 | 400/600 | meta, hints |
| `text-label` | 12 / 16 | 700 caps | sign labels, column headers |

Numbers use `font-variant-numeric: tabular-nums`. Dates `DD MMM YYYY` (e.g. `21 Nov 2026`), Asia/Kuala_Lumpur.

## 4. Space, radius, elevation, density

- Spacing scale (4px base): 4, 8, 12, 16, 24, 32, 48, 64. Page gutter 32 desktop / 16 mobile.
- Radius: `2px` chips, `4px` controls, plates, panels; `8px` dialogs, sheets, popovers. No pill shapes except avatar.
- Borders over shadows. Shadows only on overlays: `0 8px 24px rgb(16 32 26 / 0.14)`.
- Tables: 1px hairline rows (`--border-subtle`), no zebra, no boxed cells; row height 48 (comfortable) / 40 (compact, PHEP toggle).
- Touch targets ≥ 44px on mobile.

## 5. Layout & navigation

- **Desktop (≥ 1024):** 248px green rail (wordmark + role, nav items, count badges in `--badge`), collapsible to 64px icon rail. Top bar 64px on `--surface`: page title, global search, notification bell, theme + language, user menu.
- **Tablet (768–1023):** rail collapsed to icons by default.
- **Mobile (< 768):** green header 56px (wordmark, bell, menu), **bottom nav** with 4–5 role-specific items, rest in a sheet. Verify queue shows **one submission per screen** with swipe/next to the following item (raise from *vertical feed*).
- Content max width 1440; grids collapse to one column at < 768. No horizontal page scroll at 360px; wide tables scroll inside their panel or switch to cards.

## 6. Signature components

1. **Green rail** — solid `--rail` field; active item is an inverted white plate with green text; badges yellow with mono figures.
2. **Distance plate** — the signature move. A small sign plate: `--rail` fill, white 2px inner border + 1px green outline, label + mono value + arrow. Used for "days until return to class" (`Kelas · 3 hari →` / `Class · 3 days →`), quarantine progress (`Hari 4 / 7`), and clearance readiness. Never used decoratively.
3. **KPI plate** — white panel, 6px left edge in the meaning colour (rail green default, pending slate, released green), sign label, display number, one-line context.
4. **Hatched pending** — pending chips and pending row edges use the diagonal hatch.
5. **Changed-row marker** — realtime updates mark a row with a yellow left edge that holds until the row is viewed (borrowed from the Gate Board alternate's best idea).

## 7. Components (shadcn/ui restyled)

Buttons: primary (green fill), secondary (white, 1px green border, green text), ghost, destructive (red fill). 36px height desktop, 44px mobile, 4px radius, 700 weight. Inputs: 40px, 1px `--border`, focus ring 2px `--ring`. Dialogs for verify / reject (reject requires reason) / deactivate. Toasts bottom-right desktop, top on mobile, `aria-live="polite"`. Skeletons in `--surface-2`. Empty states: one line of plain copy + one action, no illustrations required.

## 8. Motion

150ms `cubic-bezier(.2,.8,.2,1)` for hovers and state; 200ms for sheets/dialogs; changed rows fade their yellow edge in over 300ms. No parallax, no bouncy springs. `prefers-reduced-motion: reduce` removes all non-essential motion.

## 9. Voice

Plain, calm, bilingual. "Awaiting your check", not "URGENT". Sentence case. Name people and dates exactly. Errors say what happened and what to do next. Demo banner: "Demo – all data is fictional" / "Demo – semua data adalah rekaan".

## 10. Don'ts

- No POLIMAS, JTMK, MOH or government crests/logos; no MySejahtera branding.
- No gradients, glassmorphism, neon, or decorative icons in tiles.
- No red-dominant screens; red appears only on positive/destructive meaning.
- No status by colour alone; no `dangerouslySetInnerHTML`.
- Not the 2022 look; not a default shadcn grey dashboard.
