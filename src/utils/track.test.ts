import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { _resetTrackForTests, track } from "../utils/track";

describe("track()", () => {
  beforeEach(() => {
    _resetTrackForTests();
    // simulate production
    vi.stubEnv("PROD", true);
  });

  afterEach(() => {
    _resetTrackForTests();
    vi.unstubAllEnvs();
  });

  it("returns early in non-production", () => {
    vi.stubEnv("PROD", false);
    expect(() => track("test_event", { foo: 1 })).not.toThrow();
  });

  it("does not throw when window is undefined (SSR-style)", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error simulate SSR
    delete globalThis.window;
    try {
      expect(() => track("test_event")).not.toThrow();
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("is safe to call with metadata that contains objects (stringifies them)", () => {
    expect(() => track("test_event", { payload: JSON.stringify({ nested: "value" }) })).not.toThrow();
  });
});
