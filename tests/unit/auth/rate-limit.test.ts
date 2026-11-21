import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: () => ({ rpc }) }));

import {
  isLoginAllowed,
  normaliseEmail,
  rateLimitKey,
  recordLoginAttempt,
} from "@/lib/auth/rate-limit";
import { sha256Hex } from "@/lib/crypto/hash";

describe("sha256Hex", () => {
  it("matches the known SHA-256 of 'abc'", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("normaliseEmail / rateLimitKey", () => {
  it("trims and lowercases", () => {
    expect(normaliseEmail(" PA@Jtmkeq.test ")).toBe("pa@jtmkeq.test");
  });
  it("is stable across email case and whitespace", async () => {
    expect(await rateLimitKey(" PA@Jtmkeq.test ", "1.2.3.4")).toBe(
      await rateLimitKey("pa@jtmkeq.test", "1.2.3.4"),
    );
  });
  it("differs by IP", async () => {
    expect(await rateLimitKey("pa@jtmkeq.test", "1.2.3.4")).not.toBe(
      await rateLimitKey("pa@jtmkeq.test", "5.6.7.8"),
    );
  });
  it("is 64 hex chars and never contains the email", async () => {
    const key = await rateLimitKey("pa@jtmkeq.test", "1.2.3.4");
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain("pa@jtmkeq.test");
  });
});

describe("rate limit wrappers", () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.restoreAllMocks();
  });

  it("allows when the RPC returns true", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await isLoginAllowed("k")).toBe(true);
    expect(rpc).toHaveBeenCalledWith("check_login_allowed", { p_key_hash: "k" });
  });

  it("blocks when the RPC returns false", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await isLoginAllowed("k")).toBe(false);
  });

  it("fails closed on RPC error and logs without the key", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "boom" } });
    expect(await isLoginAllowed("secret-key")).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toContain("secret-key");
  });

  it("records an attempt via the RPC", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await recordLoginAttempt("k", false);
    expect(rpc).toHaveBeenCalledWith("record_login_attempt", { p_key_hash: "k", p_success: false });
  });

  it("warns without the key when recording fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "boom" } });
    await recordLoginAttempt("secret-key", true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toContain("secret-key");
  });
});
