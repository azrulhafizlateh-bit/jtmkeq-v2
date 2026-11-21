import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/auth/redirect";

describe("safeNext", () => {
  it("keeps a relative path", () => expect(safeNext("/students")).toBe("/students"));
  it("keeps path with query", () => expect(safeNext("/cases?x=1&y=2")).toBe("/cases?x=1&y=2"));
  it.each([
    ["//evil.com"],
    ["https://evil.com"],
    ["/\\evil.com"],
    ["\\evil.com"],
    ["/%2F%2Fevil.com"],
    ["/%2f/evil.com"],
    ["/%5Cevil.com"],
    ["/%252F%252Fevil.com"],
    ["/\t/evil.com"],
    ["/%09/evil.com"],
    ["/\nevil"],
    ["/%00"],
    ["/%E0%A4%A"],
    ["students"],
    [""],
    ["javascript:alert(1)"],
  ])("rejects %s", (v) => expect(safeNext(v)).toBe("/dashboard"));
  it("defaults for null and undefined", () => {
    expect(safeNext(undefined)).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });
});
