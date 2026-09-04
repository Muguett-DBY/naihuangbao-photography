import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EXAM_DATE, examDateISO, getPlan, setPlanTier, subjectSteps, totalSteps } from "./law-plan";

function stubStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
  vi.stubGlobal("window", { localStorage: storage });
}

describe("law exam plan", () => {
  beforeEach(() => {
    stubStorage();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T10:00:00"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("derives all exam-date displays from the single EXAM_DATE source", () => {
    expect(EXAM_DATE.getFullYear()).toBe(2026);
    expect(EXAM_DATE.getMonth()).toBe(11);
    expect(EXAM_DATE.getDate()).toBe(26);
    expect(examDateISO()).toBe("2026-12-26");
  });

  it("counts down the days to the exam", () => {
    expect(getPlan().daysLeft).toBe(112); // 9月5日 → 12月26日
  });

  it("aggregates step totals across the five subjects", () => {
    expect(totalSteps()).toBeGreaterThan(4000);
    expect(subjectSteps("minfa")).toBeGreaterThan(1000);
    expect(subjectSteps("nonexistent")).toBe(0);
  });

  it("tightens the daily target from relaxed to intense tiers", () => {
    setPlanTier("relaxed");
    const relaxed = getPlan().dailyTarget;
    setPlanTier("standard");
    const standard = getPlan().dailyTarget;
    setPlanTier("intense");
    const intense = getPlan().dailyTarget;
    expect(relaxed).toBeLessThanOrEqual(standard);
    expect(standard).toBeLessThanOrEqual(intense);
    expect(getPlan().dailyTarget).toBeGreaterThanOrEqual(8);
  });

  it("estimates a finish date when steps remain", () => {
    const plan = getPlan();
    expect(plan.totalSteps).toBeGreaterThan(0);
    expect(plan.remainingSteps).toBe(plan.totalSteps);
    expect(plan.finishEstimate).toBeTruthy();
    expect(plan.todayPercent).toBeGreaterThanOrEqual(0);
  });
});
