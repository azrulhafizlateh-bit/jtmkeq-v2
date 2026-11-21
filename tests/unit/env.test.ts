import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const SERVICE_KEY = "SUPABASE_SERVICE_ROLE_KEY";
const SECRET = "sb_secret_super_private_value_123";

function setValidEnv() {
  vi.stubEnv(URL_KEY, "https://abcd.supabase.co");
  vi.stubEnv(ANON_KEY, "sb_publishable_abc");
  vi.stubEnv(SERVICE_KEY, SECRET);
}

describe("publicEnv", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses a valid environment", () => {
    setValidEnv();
    expect(publicEnv()).toEqual({
      [URL_KEY]: "https://abcd.supabase.co",
      [ANON_KEY]: "sb_publishable_abc",
    });
  });

  it("accepts legacy JWT-style anon keys", () => {
    setValidEnv();
    vi.stubEnv(ANON_KEY, "eyJhbGciOi.payload.sig");
    expect(publicEnv()[ANON_KEY]).toBe("eyJhbGciOi.payload.sig");
  });

  it("throws listing the missing URL key name", () => {
    setValidEnv();
    vi.stubEnv(URL_KEY, "");
    expect(() => publicEnv()).toThrow(URL_KEY);
  });

  it("throws listing the missing anon key name", () => {
    setValidEnv();
    vi.stubEnv(ANON_KEY, "");
    expect(() => publicEnv()).toThrow(ANON_KEY);
  });

  it("rejects a URL that is not a URL", () => {
    setValidEnv();
    vi.stubEnv(URL_KEY, "not-a-url");
    expect(() => publicEnv()).toThrow(URL_KEY);
  });

  it("rejects a non-http(s) URL naming the key", () => {
    setValidEnv();
    vi.stubEnv(URL_KEY, "ftp://x");
    expect(() => publicEnv()).toThrow(URL_KEY);
  });

  it("throws a clear error when env is absent", () => {
    expect(() => publicEnv()).toThrow(/Invalid environment/);
  });
});

describe("serverEnv", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses valid env and defaults DEMO_MODE to false", () => {
    setValidEnv();
    const env = serverEnv();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe(SECRET);
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://abcd.supabase.co");
    expect(env.DEMO_MODE).toBe(false);
  });

  it('parses DEMO_MODE="true" as true', () => {
    setValidEnv();
    vi.stubEnv("DEMO_MODE", "true");
    expect(serverEnv().DEMO_MODE).toBe(true);
  });

  it('parses DEMO_MODE="false" as false', () => {
    setValidEnv();
    vi.stubEnv("DEMO_MODE", "false");
    expect(serverEnv().DEMO_MODE).toBe(false);
  });

  it("throws naming the missing service role key", () => {
    setValidEnv();
    vi.stubEnv(SERVICE_KEY, "");
    expect(() => serverEnv()).toThrow(SERVICE_KEY);
  });

  it("throws naming a missing public key too", () => {
    setValidEnv();
    vi.stubEnv(URL_KEY, "");
    expect(() => serverEnv()).toThrow(URL_KEY);
  });

  it("never leaks an invalid service key value in an error message", () => {
    setValidEnv();
    const badSecret = "sb_secret_leak me please";
    vi.stubEnv(SERVICE_KEY, badSecret);
    let message = "";
    try {
      serverEnv();
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain(SERVICE_KEY);
    expect(message).not.toContain(badSecret);
    expect(message).not.toContain("leak");
  });
});
