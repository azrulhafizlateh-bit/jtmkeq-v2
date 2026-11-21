import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
const signOut = vi.fn();
let capturedSetAll: ((c: { name: string; value: string; options: object }[]) => void) | undefined;

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    opts: { cookies: { setAll: typeof capturedSetAll } },
  ) => {
    capturedSetAll = opts.cookies.setAll;
    return { auth: { getClaims, signOut } };
  },
}));

import { updateSession } from "@/lib/supabase/middleware";

const NOW = 1_800_000_000_000;

function req(path: string, cookies: Record<string, string> = {}) {
  const r = new NextRequest(new URL(path, "http://localhost:3000"));
  for (const [k, v] of Object.entries(cookies)) r.cookies.set(k, v);
  return r;
}
const authed = () => getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
const anon = () => getClaims.mockResolvedValue({ data: null, error: null });

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
    expect(res.cookies.get("jtmkeq_last_activity")).toBeUndefined();
  });

  it("signs out, redirects with reason=timeout and deletes the cookie when stale", async () => {
    authed();
    const res = await updateSession(
      req("/cases", { jtmkeq_last_activity: String(NOW - 31 * 60 * 1000) }),
    );
    expect(signOut).toHaveBeenCalledOnce();
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("reason")).toBe("timeout");
    const c = res.cookies.get("jtmkeq_last_activity");
    expect(c?.value).toBe("");
    expect(res.headers.get("set-cookie")).toMatch(/jtmkeq_last_activity=;/);
  });

  it("carries Supabase cookie changes from signOut onto the redirect", async () => {
    authed();
    signOut.mockImplementation(async () => {
      capturedSetAll?.([{ name: "sb-x-auth-token", value: "", options: { maxAge: 0 } }]);
      return { error: null };
    });
    const res = await updateSession(
      req("/cases", { jtmkeq_last_activity: String(NOW - 31 * 60 * 1000) }),
    );
    expect(res.headers.get("set-cookie")).toMatch(/sb-x-auth-token=;/);
  });

  it("passes through and refreshes the activity cookie when fresh", async () => {
    authed();
    const res = await updateSession(
      req("/cases", { jtmkeq_last_activity: String(NOW - 5 * 60 * 1000) }),
    );
    expect(signOut).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBeNull();
    const c = res.cookies.get("jtmkeq_last_activity");
    expect(c?.value).toBe(String(NOW));
    const header = res.headers.get("set-cookie")!;
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=lax/i);
    expect(header).toMatch(/Path=\//);
  });

  it("sets the cookie on first authenticated request (no cookie yet)", async () => {
    authed();
    const res = await updateSession(req("/dashboard"));
    expect(res.cookies.get("jtmkeq_last_activity")?.value).toBe(String(NOW));
  });

  it("redirects an authenticated user away from /login to /dashboard", async () => {
    authed();
    const res = await updateSession(req("/login"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/dashboard");
  });

  it("lets unauthenticated users reach public paths without setting the cookie", async () => {
    anon();
    const res = await updateSession(req("/login"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get("jtmkeq_last_activity")).toBeUndefined();
  });

  it("marks the cookie secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    authed();
    const res = await updateSession(req("/dashboard"));
    expect(res.headers.get("set-cookie")).toMatch(/Secure/i);
  });
});
