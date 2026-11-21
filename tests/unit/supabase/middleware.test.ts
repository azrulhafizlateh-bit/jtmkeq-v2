import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
const signOut = vi.fn();
type SetAll = (
  c: { name: string; value: string; options: object }[],
  headers?: Record<string, string>,
) => void;
let capturedSetAll: SetAll | undefined;

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, opts: { cookies: { setAll: SetAll } }) => {
    capturedSetAll = opts.cookies.setAll;
    return { auth: { getClaims, signOut } };
  },
}));

import { updateSession } from "@/lib/supabase/middleware";

const NOW = 1_800_000_000_000;
const MIN = 60 * 1000;

function req(
  path: string,
  cookies: Record<string, string> = {},
  init: { method?: string; headers?: Record<string, string> } = {},
) {
  const r = new NextRequest(new URL(path, "http://localhost:3000"), init);
  for (const [k, v] of Object.entries(cookies)) r.cookies.set(k, v);
  return r;
}
const fresh = { jtmkeq_last_activity: String(NOW - 5 * MIN) };
const stale = { jtmkeq_last_activity: String(NOW - 31 * MIN) };
const authed = () => getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
const anon = () => getClaims.mockResolvedValue({ data: null, error: null });
const reason = (res: Response) => new URL(res.headers.get("location")!).searchParams.get("reason");

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.setSystemTime(NOW);
  getClaims.mockReset();
  signOut.mockReset().mockResolvedValue({ error: null });
  capturedSetAll = undefined;
});

describe("updateSession", () => {
  it("redirects unauthenticated protected paths to login with next", async () => {
    anon();
    const res = await updateSession(req("/students?q=a b"));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("next")).toBe("/students?q=a%20b");
  });

  it("signs out locally, redirects with reason=timeout and deletes the cookie when stale", async () => {
    authed();
    const res = await updateSession(req("/cases", stale));
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe("/login");
    expect(reason(res)).toBe("timeout");
    expect(res.cookies.get("jtmkeq_last_activity")?.value).toBe("");
    expect(res.headers.get("set-cookie")).toMatch(/jtmkeq_last_activity=;/);
  });

  it("carries Supabase cookie changes from signOut onto the redirect", async () => {
    authed();
    signOut.mockImplementation(async () => {
      capturedSetAll?.([{ name: "sb-x-auth-token", value: "", options: { maxAge: 0 } }]);
      return { error: null };
    });
    const res = await updateSession(req("/cases", stale));
    expect(res.headers.get("set-cookie")).toMatch(/sb-x-auth-token=;/);
  });

  it("passes through and refreshes the activity cookie when fresh", async () => {
    authed();
    const res = await updateSession(req("/cases", fresh));
    expect(signOut).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get("jtmkeq_last_activity")?.value).toBe(String(NOW));
    const header = res.headers.get("set-cookie")!;
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=lax/i);
    expect(header).toMatch(/Path=\//);
    expect(header).not.toMatch(/Max-Age|Expires/i);
  });

  it("treats a missing cookie on an authenticated request as timed out", async () => {
    authed();
    const res = await updateSession(req("/dashboard"));
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(reason(res)).toBe("timeout");
  });

  it("treats a non-numeric cookie as timed out", async () => {
    authed();
    const res = await updateSession(req("/dashboard", { jtmkeq_last_activity: "garbage" }));
    expect(reason(res)).toBe("timeout");
  });

  it("treats a future-dated cookie as timed out", async () => {
    authed();
    const res = await updateSession(
      req("/dashboard", { jtmkeq_last_activity: String(NOW + 10 * MIN) }),
    );
    expect(reason(res)).toBe("timeout");
  });

  it("clears auth cookies on the redirect when local signOut fails", async () => {
    authed();
    signOut.mockResolvedValue({ error: new Error("network") });
    const res = await updateSession(
      req("/cases", { ...stale, "sb-abc-auth-token": "x", "sb-abc-auth-token.0": "y", other: "z" }),
    );
    const header = res.headers.get("set-cookie")!;
    expect(header).toMatch(/sb-abc-auth-token=;/);
    expect(header).toMatch(/sb-abc-auth-token\.0=;/);
    expect(header).not.toMatch(/other=/);
  });

  it("redirects an authenticated GET of /login to /dashboard", async () => {
    authed();
    const res = await updateSession(req("/login", fresh));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/dashboard");
  });

  it("does not redirect a POST to /login for an authenticated user", async () => {
    authed();
    const res = await updateSession(req("/login", fresh, { method: "POST" }));
    expect(res.headers.get("location")).toBeNull();
  });

  it("does not refresh the timestamp for prefetch requests", async () => {
    authed();
    const res = await updateSession(
      req("/dashboard", fresh, { headers: { "next-router-prefetch": "1" } }),
    );
    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get("jtmkeq_last_activity")).toBeUndefined();
  });

  it("still times out stale prefetch requests", async () => {
    authed();
    const res = await updateSession(req("/dashboard", stale, { headers: { purpose: "prefetch" } }));
    expect(reason(res)).toBe("timeout");
  });

  it("copies cache headers from setAll onto redirects", async () => {
    getClaims.mockImplementation(async () => {
      capturedSetAll?.([], { "Cache-Control": "private, no-store" });
      return { data: null, error: null };
    });
    const res = await updateSession(req("/students"));
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("lets unauthenticated users reach public paths", async () => {
    anon();
    const res = await updateSession(req("/login"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("deletes a leftover activity cookie when unauthenticated", async () => {
    anon();
    const res = await updateSession(req("/login", { jtmkeq_last_activity: "123" }));
    expect(res.headers.get("set-cookie")).toMatch(/jtmkeq_last_activity=;/);
  });

  it("marks the cookie secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    authed();
    const res = await updateSession(req("/dashboard", fresh));
    expect(res.headers.get("set-cookie")).toMatch(/Secure/i);
  });
});
