import { describe, expect, it } from "vitest";
import { onRequestGet } from "./health";

describe("GET /api/health", () => {
  it("returns an uncached JSON health response with API security headers", async () => {
    const response = await onRequestGet({} as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(body).toEqual({
      ok: true,
      status: "healthy",
      service: "naihuangbao-photography",
    });
  });
});
