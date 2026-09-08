import { describe, expect, it } from "vitest";
import type { LawLessonProgress, LawProgressMap } from "../../../lib/law-progress";
import { countStudyDays, dailyActivity, formatDayLabel } from "./dailyActivity";

const DAY = 86_400_000;
const NOW = Date.parse("2026-09-08T10:00:00");

function lesson(completedAt?: number, steps = 3): LawLessonProgress {
  const stepsDone: Record<string, boolean> = {};
  for (let i = 0; i < steps; i += 1) stepsDone[`s${i}`] = true;
  return { stepsDone, quizBest: 2, quizTotal: 4, wrongCount: 0, lastVisitedAt: NOW, completedAt };
}

describe("dailyActivity", () => {
  it("按自然日聚合完成课时数与步数，旧→新共 30 项", () => {
    const today = new Date(NOW);
    today.setHours(0, 0, 0, 0);
    const yesterday = today.getTime() - DAY;
    const progress: LawProgressMap = {
      "minfa-q001": lesson(today.getTime() + 1000, 4),
      "minfa-q002": lesson(today.getTime() + 2000, 2),
      "minfa-q003": lesson(yesterday + 1000, 5),
      "minfa-q004": lesson(), // 未完成 → 不计入
    };
    const series = dailyActivity(progress, 30, NOW);
    expect(series).toHaveLength(30);
    expect(series[29]).toMatchObject({ lessons: 2, steps: 6 });
    expect(series[28]).toMatchObject({ lessons: 1, steps: 5 });
    expect(series[27].lessons).toBe(0);
  });

  it("30 天窗口外的完成不计入柱状图，但计入累计学习天数", () => {
    const old = NOW - 40 * DAY;
    const progress: LawProgressMap = { "xingfa-q001": lesson(old) };
    const series = dailyActivity(progress, 30, NOW);
    expect(series.reduce((sum, day) => sum + day.lessons, 0)).toBe(0);
    expect(countStudyDays(progress)).toBe(1);
  });

  it("同一天多课时合并到同一柱", () => {
    const progress: LawProgressMap = {
      "minfa-q001": lesson(NOW - 1000),
      "minfa-q002": lesson(NOW - 2000),
      "minfa-q003": lesson(NOW - 3000),
    };
    const series = dailyActivity(progress, 7, NOW);
    expect(series[series.length - 1].lessons).toBe(3);
    expect(series[series.length - 1].steps).toBe(9);
  });

  it("空进度给出全零序列", () => {
    const series = dailyActivity({}, 30, NOW);
    expect(series).toHaveLength(30);
    expect(series.every((day) => day.lessons === 0 && day.steps === 0)).toBe(true);
  });

  it("日期刻度格式为 M/D", () => {
    expect(formatDayLabel(Date.parse("2026-09-08T00:00:00"))).toBe("9/8");
    expect(formatDayLabel(Date.parse("2026-12-25T00:00:00"))).toBe("12/25");
  });
});
