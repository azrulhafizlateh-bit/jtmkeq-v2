import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 200 with status ok, a version and an ISO time", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = (await response.json()) as { status: string; version: string; time: string };
    expect(body.status).toBe("ok");
    expect(body.version.length).toBeGreaterThan(0);
    expect(new Date(body.time).toISOString()).toBe(body.time);
  });

  it("is never cached", async () => {
    const response = await GET();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("reports the short commit SHA as version when deployed", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abcdef1234567890");
    const body = (await (await GET()).json()) as { version: string };
    expect(body.version).toBe("abcdef1");
  });

  it("falls back to dev when no commit SHA is set", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    const body = (await (await GET()).json()) as { version: string };
    expect(body.version).toBe("dev");
  });
});
