import { describe, expect, it } from "vitest";
import {
  activityCookie,
  INACTIVITY_LIMIT_MS,
  isInactive,
  isProtectedPath,
  parseLastActivity,
} from "@/lib/auth/session";

const MIN = 60 * 1000;
const now = 1_800_000_000_000;

describe("isInactive", () => {
  it("is false at 29 minutes", () => expect(isInactive(now - 29 * MIN, now)).toBe(false));
  it("is true at 31 minutes", () => expect(isInactive(now - 31 * MIN, now)).toBe(true));
  it("is true for null (missing cookie fails closed)", () =>
    expect(isInactive(null, now)).toBe(true));
  it("is true for future-dated beyond skew", () =>
    expect(isInactive(now + 61_000, now)).toBe(true));
  it("tolerates small skew", () => expect(isInactive(now + 30_000, now)).toBe(false));
  it("is false exactly at the limit", () =>
    expect(isInactive(now - INACTIVITY_LIMIT_MS, now)).toBe(false));
});

describe("parseLastActivity", () => {
  it("parses epoch ms", () => expect(parseLastActivity("1800000000000")).toBe(1_800_000_000_000));
  it.each([undefined, "", "abc", "-5", "1e9", "12.5"])("rejects %s", (v) =>
    expect(parseLastActivity(v)).toBeNull(),
  );
});

describe("isProtectedPath", () => {
  it.each(["/dashboard", "/students/123", "/admin/users", "/clearance", "/security/mfa"])(
    "protects %s",
    (p) => expect(isProtectedPath(p)).toBe(true),
  );
  it.each(["/", "/login", "/api/health", "/students-public", "/dashboardx", "/forgot-password"])(
    "does not protect %s",
    (p) => expect(isProtectedPath(p)).toBe(false),
  );
});

describe("activityCookie", () => {
  it("is a browser-session httpOnly lax cookie", () => {
    const c = activityCookie(now);
    expect(c.name).toBe("jtmkeq_last_activity");
    expect(c.value).toBe(String(now));
    expect(c.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    expect(c.options).not.toHaveProperty("maxAge");
    expect(c.options).not.toHaveProperty("expires");
  });
});
