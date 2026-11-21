import { describe, expect, it } from "vitest";
import { checkGuard as guard } from "../../../scripts/db-guard-lib.mjs";

describe("checkGuard", () => {
  it("refuses when no project is linked", () => {
    const r = guard({ linkedRef: "", prodRef: "prod1" });
    expect(r.ok).toBe(false);
    expect(r.message).toContain("no linked project");
  });

  it("refuses when SUPABASE_PROD_REF is empty or unset (fail closed)", () => {
    for (const prodRef of ["", "  ", undefined]) {
      const r = guard({ linkedRef: "dev1", prodRef });
      expect(r.ok).toBe(false);
      expect(r.message).toBe("Set SUPABASE_PROD_REF in .env.local so the prod guard can run.");
    }
  });

  it("refuses when the linked project is PROD", () => {
    const r = guard({ linkedRef: "prod1\n", prodRef: "prod1" });
    expect(r).toEqual({ ok: false, message: "Refusing: linked project is PROD" });
  });

  it("allows a linked project that differs from PROD", () => {
    expect(guard({ linkedRef: "dev1", prodRef: "prod1" }).ok).toBe(true);
  });
});
