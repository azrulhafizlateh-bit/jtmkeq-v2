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

/** Tolerated clock skew for timestamps that appear to be in the future. */
const FUTURE_SKEW_MS = 60 * 1000;

/**
 * Fails closed: a missing/unparseable timestamp (null) or a future-dated one is
 * treated as inactive, so omitting or forging the cookie cannot extend a session.
 */
export function isInactive(lastActivityMs: number | null, nowMs: number): boolean {
  if (lastActivityMs === null) return true;
  if (lastActivityMs > nowMs + FUTURE_SKEW_MS) return true;
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

/**
 * The last-activity cookie. A browser-session cookie on purpose (no maxAge or
 * expires): the server, not the browser, decides when it is stale. The login
 * action (Task 1.5) must set this at sign-in and logout must delete it; until
 * then an existing session is timed out once, which is expected.
 */
export function activityCookie(nowMs: number) {
  return {
    name: LAST_ACTIVITY_COOKIE,
    value: String(nowMs),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  };
}
