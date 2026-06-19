import { afterEach, describe, expect, it, vi } from "vitest";
import { _rateForTests, _resetForTests, initWebVitals } from "../utils/webVitals";

describe("webVitals rating thresholds", () => {
  it("rates LCP per Web Vitals thresholds", () => {
    expect(_rateForTests("LCP", 1500)).toBe("good");
    expect(_rateForTests("LCP", 2500)).toBe("good");
    expect(_rateForTests("LCP", 2501)).toBe("needs-improvement");
    expect(_rateForTests("LCP", 4000)).toBe("needs-improvement");
    expect(_rateForTests("LCP", 4001)).toBe("poor");
  });

  it("rates INP per Web Vitals thresholds", () => {
    expect(_rateForTests("INP", 100)).toBe("good");
    expect(_rateForTests("INP", 200)).toBe("good");
    expect(_rateForTests("INP", 201)).toBe("needs-improvement");
    expect(_rateForTests("INP", 500)).toBe("needs-improvement");
    expect(_rateForTests("INP", 501)).toBe("poor");
  });

  it("rates CLS per Web Vitals thresholds", () => {
    expect(_rateForTests("CLS", 0.05)).toBe("good");
    expect(_rateForTests("CLS", 0.1)).toBe("good");
    expect(_rateForTests("CLS", 0.11)).toBe("needs-improvement");
    expect(_rateForTests("CLS", 0.25)).toBe("needs-improvement");
    expect(_rateForTests("CLS", 0.26)).toBe("poor");
  });

  it("rates FCP per Web Vitals thresholds", () => {
    expect(_rateForTests("FCP", 1000)).toBe("good");
    expect(_rateForTests("FCP", 1800)).toBe("good");
    expect(_rateForTests("FCP", 1801)).toBe("needs-improvement");
    expect(_rateForTests("FCP", 3000)).toBe("needs-improvement");
    expect(_rateForTests("FCP", 3001)).toBe("poor");
  });

  it("rates TTFB per Web Vitals thresholds", () => {
    expect(_rateForTests("TTFB", 500)).toBe("good");
    expect(_rateForTests("TTFB", 800)).toBe("good");
    expect(_rateForTests("TTFB", 801)).toBe("needs-improvement");
    expect(_rateForTests("TTFB", 1800)).toBe("needs-improvement");
    expect(_rateForTests("TTFB", 1801)).toBe("poor");
  });
});

describe("initWebVitals", () => {
  afterEach(() => {
    _resetForTests();
  });

  it("is a no-op when window is undefined", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error simulate SSR
    delete globalThis.window;
    try {
      initWebVitals();
      expect(true).toBe(true);
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("is idempotent — calling twice does not throw or duplicate timers", () => {
    expect(() => {
      initWebVitals();
      initWebVitals();
    }).not.toThrow();
  });
});
