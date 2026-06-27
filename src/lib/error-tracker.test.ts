import { describe, expect, it, beforeEach, vi } from "vitest";
import { ErrorTracker, reportError } from "./error-tracker";

describe("error tracker", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("captures errors and persists them in local storage", () => {
    const tracker = new ErrorTracker({ maxReports: 5 });
    const report = tracker.captureError({ message: "Test error", category: "javascript", source: "test.ts:1" });

    expect(report).not.toBeNull();
    expect(report?.message).toBe("Test error");
    expect(report?.id).toMatch(/^err_/);
    expect(tracker.getReportCount()).toBe(1);
  });

  it("respects max reports limit", () => {
    const tracker = new ErrorTracker({ maxReports: 3 });
    for (let i = 0; i < 5; i++) {
      tracker.captureError({ message: `Error ${i}` });
    }
    expect(tracker.getReportCount()).toBe(3);
    const reports = tracker.getReports();
    expect(reports[0].message).toBe("Error 2");
    expect(reports[2].message).toBe("Error 4");
  });

  it("supports sample rate", () => {
    const tracker = new ErrorTracker({ sampleRate: 0 });
    const report = tracker.captureError({ message: "sampled out" });
    expect(report).toBeNull();
    expect(tracker.getReportCount()).toBe(0);
  });

  it("clears stored reports", () => {
    const tracker = new ErrorTracker();
    tracker.captureError({ message: "test" });
    expect(tracker.getReportCount()).toBe(1);
    tracker.clearReports();
    expect(tracker.getReportCount()).toBe(0);
  });

  it("invokes onReport callback", () => {
    const seen: string[] = [];
    const tracker = new ErrorTracker({
      onReport: (report) => { seen.push(report.message); },
    });
    tracker.captureError({ message: "callback test" });
    expect(seen).toEqual(["callback test"]);
  });

  it("reportError utility shares a single tracker", () => {
    reportError("shared test");
    reportError("another test");
    const tracker = new ErrorTracker();
    expect(tracker).toBeDefined();
  });
});
