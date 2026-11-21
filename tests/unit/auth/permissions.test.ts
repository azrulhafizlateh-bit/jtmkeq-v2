import { describe, expect, it } from "vitest";

import { CAPABILITIES, can, type Capability, type Role } from "@/lib/auth/permissions";

// Table-driven from SPEC section 4. Columns: PHEP, PA, KJ.
const TABLE: ReadonlyArray<readonly [Capability, boolean, boolean, boolean]> = [
  ["account.change_password", true, true, true],
  ["users.manage", true, false, false],
  ["students.create", false, true, false],
  ["students.edit", true, true, false],
  ["students.verify", true, false, false],
  ["cases.create", false, true, false],
  ["cases.edit", true, true, false],
  ["cases.verify", true, false, false],
  ["cases.extend", true, true, false],
  ["deletion.request", true, false, false],
  ["deletion.decide", true, false, true],
  ["upload_link.send", false, true, false],
  ["clearance.issue", true, true, false],
  ["security.view", true, false, true],
  ["security.handle_alert", true, false, true],
  ["audit.integrity_check", true, false, true],
  ["hso.view", true, true, true],
  ["lists.view", true, true, true],
  ["reports.export", true, true, true],
  ["audit.view", true, false, true],
  ["feedback.submit", true, true, true],
  ["feedback.manage", true, false, false],
  ["sop.manage", true, false, false],
];

const ROLES: readonly Role[] = ["phep", "pa", "kj"];

const CASES = TABLE.flatMap(([cap, ...allowed]) =>
  ROLES.map((role, i) => [role, cap, allowed[i]] as const),
);

describe("can", () => {
  it("covers every capability in the matrix", () => {
    expect([...TABLE.map(([c]) => c)].sort()).toEqual([...CAPABILITIES].sort());
  });

  it.each(CASES)("can(%s, %s) === %s", (role, cap, expected) => {
    expect(can(role, cap)).toBe(expected);
  });

  it("spot checks from the brief", () => {
    expect(can("pa", "students.verify")).toBe(false);
    expect(can("kj", "deletion.decide")).toBe(true);
    expect(can("pa", "audit.view")).toBe(false);
    expect(can("phep", "sop.manage")).toBe(true);
    expect(can("kj", "students.create")).toBe(false);
  });
});
