# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Next.js (App Router) + TypeScript strict, Tailwind CSS + shadcn/ui + lucide-react, Supabase (hosted dev + prod projects; no local Docker), Vercel. Full list in `SPEC.md` §3.

## Users
Primary (design for these first): staff of the Department of IT & Communication (JTMK) at a Malaysian polytechnic doing daily work.
- **PA (Academic Advisor):** often on a phone between classes; adds advisees, logs quarantine cases with an HSO screenshot, fixes rejected submissions.
- **PHEP (Student Affairs Officer, admin):** at a desk; clears a verification queue, manages users, issues clearance letters, produces the daily status report.
- **KJ (Head of Department):** oversight; reads dashboards, audit log, Security Insights; approves deletions.

Secondary: recruiters and engineers arriving from LinkedIn who click a one-click demo role. They judge the product by how real and well-built the staff experience feels; the public landing page does the persuading.

Public, unauthenticated: a student uploading an HSO via a one-time link; a lecturer scanning a clearance QR code.

## Product Purpose
Replace scattered Excel/Google Forms tracking of COVID-19 positive and close-contact students with one verified, auditable system: PA submits → PHEP verifies (or rejects with reason) → everyone sees who is in quarantine and when they return. Success: live demo a recruiter can operate in two minutes, with security and integrity visible.

## Positioning
A small institutional tool engineered like a security product: RLS as the authority, tamper-evident hash-chained audit log, four-eyes approvals, and explainable insider-threat alerts about its own staff users (connects to the author's insider-threat research).

## Operating Context
Malaysian polytechnic, Asia/Kuala_Lumpur timezone, English default with Bahasa Melayu. HSO = MySejahtera Home Surveillance Order screenshot. Dates `DD MMM YYYY`. Original 2022 PHP system is the anti-reference for look.

## Capabilities and Constraints
See `SPEC.md` §4–§9 for roles, features and routes; `CONSTRAINTS.md` for quality gates; `docs/superpowers/specs/2026-11-21-foundation-decisions-design.md` for setup decisions. Free tiers only.

## Brand Commitments
- Text wordmark "JTMK e-Quarantine" (short: JTMKEQ). No POLIMAS, JTMK, MOH or government logos or crests — the public demo must never be mistaken for an official system.
- Status semantics fixed by spec: positive = red, close contact = amber, released = green, pending = slate.
- Owner's goal: it should look like a modern, polished web app.
- Owner's anti-goals: looks like a template; feels alarming (this is health data about students — calm, not panic).

## Evidence on Hand
None yet. All demo data is synthetic and must be labelled fictional (matric prefix `99`, watermarked sample HSO images). Never invent usage numbers, testimonials, or institutional endorsements.

## Product Principles
1. Verified or it didn't happen — every record shows who submitted, who verified, and when.
2. Calm under load — the busiest screen (verify queue) stays readable and unhurried.
3. Security you can see — controls are explained in the UI, not hidden.
4. Least data — show masked identifiers by default; reveal only with permission.
5. Phone-first for PAs, desk-dense for PHEP.

## Accessibility & Inclusion
WCAG 2.2 AA; works from 360 px; bilingual EN/BM; status never conveyed by colour alone.
