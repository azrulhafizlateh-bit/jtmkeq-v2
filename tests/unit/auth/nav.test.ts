import { describe, expect, it } from "vitest";

import { navFor } from "@/lib/auth/nav";
import { can, type Role } from "@/lib/auth/permissions";

const hrefs = (role: Role) => navFor(role).map((i) => i.href);

describe("navFor", () => {
  it("lists dashboard first for every role", () => {
    for (const role of ["phep", "pa", "kj"] as const) {
      expect(hrefs(role)[0]).toBe("/dashboard");
    }
  });

  it("returns the exact ordered routes for PHEP", () => {
    expect(hrefs("phep")).toEqual([
      "/dashboard",
      "/verify",
      "/students",
      "/cases",
      "/approvals",
      "/clearance",
      "/reports",
      "/security",
      "/audit",
      "/admin/users",
      "/admin/classes",
      "/feedback",
      "/sop",
    ]);
  });

  it("returns the exact ordered routes for PA", () => {
    expect(hrefs("pa")).toEqual([
      "/dashboard",
      "/students",
      "/students/new",
      "/cases",
      "/cases/new",
      "/clearance",
      "/reports",
      "/feedback",
      "/sop",
    ]);
  });

  it("returns the exact ordered routes for KJ", () => {
    expect(hrefs("kj")).toEqual([
      "/dashboard",
      "/students",
      "/cases",
      "/approvals",
      "/reports",
      "/security",
      "/audit",
      "/feedback",
      "/sop",
    ]);
  });

  it("excludes routes the role must not see", () => {
    expect(hrefs("pa")).not.toContain("/verify");
    expect(hrefs("pa")).not.toContain("/audit");
    expect(hrefs("pa")).not.toContain("/security");
    expect(hrefs("kj")).not.toContain("/students/new");
    expect(hrefs("kj")).not.toContain("/verify");
  });

  it("only shows items whose capability the role holds", () => {
    for (const role of ["phep", "pa", "kj"] as const) {
      for (const item of navFor(role)) {
        if (item.cap) expect(can(role, item.cap), `${role} ${item.href}`).toBe(true);
      }
    }
  });

  it("gives every item a label key and icon", () => {
    for (const role of ["phep", "pa", "kj"] as const) {
      for (const item of navFor(role)) {
        expect(item.labelKey).toMatch(/^nav\./);
        expect(item.icon.length).toBeGreaterThan(0);
      }
    }
  });
});
