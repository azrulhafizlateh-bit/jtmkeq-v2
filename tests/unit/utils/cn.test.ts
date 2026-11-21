import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("cn", () => {
  it("keeps a custom font-size token next to a text colour", () => {
    expect(cn("text-small text-fg-muted")).toBe("text-small text-fg-muted");
  });

  it("keeps the text colour when a custom size overrides a default size", () => {
    expect(
      cn("text-sm font-bold bg-primary text-primary-foreground", "text-small"),
    ).toBe("font-bold bg-primary text-primary-foreground text-small");
  });

  it("lets the later custom size win", () => {
    expect(cn("text-small", "text-h1")).toBe("text-h1");
  });

  it("still resolves colour conflicts", () => {
    expect(cn("text-fg", "text-fg-muted")).toBe("text-fg-muted");
  });
});
