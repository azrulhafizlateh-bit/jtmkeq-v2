import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { config } from "@/proxy";

const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("proxy matcher", () => {
  it.each([
    "/admin/roadmap",
    "/settings/css",
    "/sop/js",
    "/students/ahmad-ico",
    "/dashboard",
    "/api/healthz",
    "/login",
  ])("runs the proxy for %s", (p) => expect(matches(p)).toBe(true));

  it.each(["/api/health", "/_next/static/x.js", "/_next/image", "/favicon.ico", "/logo.svg"])(
    "skips %s",
    (p) => expect(matches(p)).toBe(false),
  );
});
