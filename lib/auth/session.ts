export const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
export const LAST_ACTIVITY_COOKIE = "jtmkeq_last_activity";

export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/students",
  "/cases",
  "/verify",
  "/reports",
  "/admin",
  "/audit",
  "/feedback",
  "/sop",
  "/settings",
  "/security",
  "/approvals",
  "/clearance",
] as const;

/** A missing timestamp (first request) is not inactivity. */
export function isInactive(lastActivityMs: number | null, nowMs: number): boolean {
  if (lastActivityMs === null) return false;
  return nowMs - lastActivityMs > INACTIVITY_LIMIT_MS;
}

/** Parses the cookie value; anything that is not a sane epoch-ms number is treated as absent. */
export function parseLastActivity(raw: string | undefined): number | null {
  if (!raw || !/^\d{1,15}$/.test(raw)) return null;
  return Number(raw);
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
