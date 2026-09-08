import { describe, expect, it } from "vitest";
import type { LawLessonProgress, LawProgressMap } from "../../../lib/law-progress";
import type { LawHistoryDay } from "../../../lib/law-history";
import { countStudyDays, dailyActivity, dailyActivityWithHistory, formatDayLabel } from "./dailyActivity";

const DAY = 86_400_000;
const NOW = Date.parse("2026-09-08T10:00:00");

function lesson(completedAt?: number, steps = 3): LawLessonProgress {
  const stepsDone: Record<string, boolean> = {};
  for (let i = 0; i < steps; i += 1) stepsDone[`s${i}`] = true;
  return { stepsDone, quizBest: 2, quizTotal: 4, wrongCount: 0, lastVisitedAt: NOW, completedAt };
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
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

describe("dailyActivityWithHistory（S6·T2 真实逐日步数口径）", () => {
  const today = new Date(NOW);
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const yesterdayStart = todayStart - DAY;

  it("历史覆盖的日子取真实记录（课时+步数），不与旧口径重复计数", () => {
    const history: LawHistoryDay[] = [{ d: dayKey(NOW), s: 17, l: 2, t: NOW }];
    // 同日还有 2 门已完成课的存量进度——有历史记录时不再用 completedAt 口径叠加
    const progress: LawProgressMap = {
      "minfa-q001": lesson(todayStart + 1000, 4),
      "minfa-q002": lesson(todayStart + 2000, 2),
    };
    const series = dailyActivityWithHistory(progress, history, 30, NOW);
    expect(series[29]).toEqual({ dayStart: todayStart, lessons: 2, steps: 17, fromHistory: true });
  });

  it("历史开始之前的日子回退旧口径（completedAt 归集），fromHistory=false", () => {
    const history: LawHistoryDay[] = [{ d: dayKey(NOW), s: 5, l: 1, t: NOW }];
    const progress: LawProgressMap = {
      "minfa-q003": lesson(yesterdayStart + 1000, 5), // 升级前昨天的存量完成
    };
    const series = dailyActivityWithHistory(progress, history, 30, NOW);
    expect(series[28]).toEqual({ dayStart: yesterdayStart, lessons: 1, steps: 5, fromHistory: false });
    expect(series[29]).toMatchObject({ lessons: 1, steps: 5, fromHistory: true });
  });

  it("完全无历史时与旧口径 dailyActivity 逐日一致（向后兼容）", () => {
    const progress: LawProgressMap = {
      "minfa-q001": lesson(todayStart + 1000, 4),
      "minfa-q003": lesson(yesterdayStart + 1000, 5),
    };
    const legacy = dailyActivity(progress, 14, NOW);
    const upgraded = dailyActivityWithHistory(progress, [], 14, NOW);
    expect(upgraded).toEqual(legacy.map((day) => ({ ...day, fromHistory: false })));
  });

  it("历史窗口外的日子（更早的存量完成）照常回退旧口径", () => {
    const threeDaysAgo = todayStart - 3 * DAY;
    const history: LawHistoryDay[] = [{ d: dayKey(NOW), s: 2, l: 1, t: NOW }];
    const progress: LawProgressMap = { "xingfa-q001": lesson(threeDaysAgo + 500, 6) };
    const series = dailyActivityWithHistory(progress, history, 7, NOW);
    expect(series[3]).toMatchObject({ lessons: 1, steps: 6, fromHistory: false });
  });

  it("旧口径 dailyActivity 保持原签名与行为（其他调用方不破坏）", () => {
    const series = dailyActivity({}, 3, NOW);
    expect(series).toHaveLength(3);
    expect(series.every((day) => day.lessons === 0 && day.steps === 0 && !day.fromHistory)).toBe(true);
  });
});
