import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieSet = vi.fn();
const cookieGetAll = vi.fn(() => [{ name: "sb-token", value: "abc" }]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: cookieGetAll, set: cookieSet }),
}));

import { createAdminSupabase } from "@/lib/supabase/admin";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { createServerSupabase } from "@/lib/supabase/server";

function setValidEnv() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcd.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_abc");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_abc");
}

describe("supabase client factories", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    cookieSet.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("createAdminSupabase throws naming the missing service key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcd.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_abc");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => createAdminSupabase()).toThrow("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("createAdminSupabase returns a client when env is valid", () => {
    setValidEnv();
    expect(typeof createAdminSupabase().from).toBe("function");
  });

  it("createBrowserSupabase throws when public env is missing", () => {
    expect(() => createBrowserSupabase()).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("createBrowserSupabase returns a client when env is valid", () => {
    setValidEnv();
    expect(typeof createBrowserSupabase().auth.getUser).toBe("function");
  });

  it("createServerSupabase rejects when public env is missing", async () => {
    await expect(createServerSupabase()).rejects.toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("createServerSupabase returns a client using the cookie store", async () => {
    setValidEnv();
    const client = await createServerSupabase();
    expect(typeof client.auth.getUser).toBe("function");
  });
});
