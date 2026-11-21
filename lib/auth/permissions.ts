import type { Database } from "@/lib/supabase/database.types";

/** Single source of truth for roles: the DB enum, so DB and TS cannot drift. */
export type Role = Database["public"]["Enums"]["user_role"];

/**
 * Capabilities, one per row of SPEC section 4 ("area.action").
 * "Verify a record they created themselves" is intentionally absent: it is a
 * blocked-for-everyone rule enforced by RLS and server actions, not a grant.
 */
export type Capability =
  | "account.change_password"
  | "users.manage"
  | "students.create"
  | "students.edit"
  | "students.verify"
  | "cases.create"
  | "cases.edit"
  | "cases.verify"
  | "cases.extend"
  | "deletion.request"
  | "deletion.decide"
  | "upload_link.send"
  | "clearance.issue"
  | "security.view"
  | "security.handle_alert"
  | "audit.integrity_check"
  | "hso.view"
  | "lists.view"
  | "reports.export"
  | "audit.view"
  | "feedback.submit"
  | "feedback.manage"
  | "sop.manage";

const ALL: readonly Role[] = ["phep", "pa", "kj"];

/**
 * Typed as Record<Capability, ...> so adding a capability without a row is a
 * compile error. Where SPEC marks a PA cell "(request ...)" (cases.extend,
 * clearance.issue) PA is listed because PA may initiate; PHEP verifies.
 */
const MATRIX: Record<Capability, readonly Role[]> = {
  "account.change_password": ALL,
  "users.manage": ["phep"],
  "students.create": ["pa"],
  "students.edit": ["phep", "pa"],
  "students.verify": ["phep"],
  "cases.create": ["pa"],
  "cases.edit": ["phep", "pa"],
  "cases.verify": ["phep"],
  "cases.extend": ["phep", "pa"],
  "deletion.request": ["phep"],
  "deletion.decide": ["phep", "kj"],
  "upload_link.send": ["pa"],
  "clearance.issue": ["phep", "pa"],
  "security.view": ["phep", "kj"],
  "security.handle_alert": ["phep", "kj"],
  "audit.integrity_check": ["phep", "kj"],
  "hso.view": ALL,
  "lists.view": ALL,
  "reports.export": ALL,
  "audit.view": ["phep", "kj"],
  "feedback.submit": ALL,
  "feedback.manage": ["phep"],
  "sop.manage": ["phep"],
};

export const CAPABILITIES = Object.keys(MATRIX) as Capability[];

/**
 * May this role EVER hold this capability? Scope qualifiers from SPEC section 4
 * ("own advisees", "own, while pending/rejected", "not own request", "other
 * PHEP", "not alerts about self") are NOT evaluated here; Postgres RLS is
 * authoritative and server actions re-check them. Use this for UI hiding and
 * as a first gate only.
 */
export function can(role: Role, cap: Capability): boolean {
  return MATRIX[cap].includes(role);
}
