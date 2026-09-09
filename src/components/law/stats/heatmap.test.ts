import { describe, expect, it } from "vitest";
import type { LawProgressMap } from "../../../lib/law-progress";
import { heatmapCellLabel, heatmapCounts, heatmapGrid, heatmapLevel, startOfDay } from "./heatmap";

const NOW = new Date(2026, 8, 10, 15, 30).getTime(); // 2026-09-10 15:30 本地时间
const DAY = 86_400_000;

/** 用本地日历回退（而非精确毫秒），避免夏令时边界上"N 天前"漂移到别的日期 */
function daysAgoNoon(offset: number): number {
  return new Date(2026, 8, 10 - offset, 12, 0).getTime();
}

function progressOn(dayOffsetsAgo: number[]): LawProgressMap {
  const lessons: LawProgressMap = {};
  dayOffsetsAgo.forEach((offset, index) => {
    lessons[`minfa-q1${index}${offset}`] = {
      stepsDone: {},
      quizBest: 0,
      quizTotal: 0,
      wrongCount: 0,
      lastVisitedAt: 0,
      completedAt: daysAgoNoon(offset),
    };
  });
  return lessons;
}

describe("学习热力图数据引擎", () => {
  it("heatmapCounts：空进度全为 0；completedAt 落在正确的自然日；窗口外/未来时间忽略", () => {
    const empty = heatmapCounts({}, 30, NOW);
    expect(empty).toHaveLength(30);
    expect(empty.every((day) => day.count === 0)).toBe(true);
    expect(empty[empty.length - 1].dayStart).toBe(startOfDay(NOW));

    const counts = heatmapCounts(progressOn([0, 0, 1, 3, 400]), 365, NOW);
    expect(counts[counts.length - 1].count).toBe(2); // 今天 2 课
    expect(counts[counts.length - 2].count).toBe(1); // 昨天 1 课
    expect(counts[counts.length - 4].count).toBe(1); // 3 天前 1 课
    const total = counts.reduce((sum, day) => sum + day.count, 0);
    expect(total).toBe(4); // 400 天前不在 365 天窗口内
  });

  it("heatmapLevel：5 级色深阈值 0/1/2-3/4-6/≥7", () => {
    expect(heatmapLevel(0)).toBe(0);
    expect(heatmapLevel(1)).toBe(1);
    expect(heatmapLevel(2)).toBe(2);
    expect(heatmapLevel(3)).toBe(2);
    expect(heatmapLevel(4)).toBe(3);
    expect(heatmapLevel(6)).toBe(3);
    expect(heatmapLevel(7)).toBe(4);
    expect(heatmapLevel(50)).toBe(4);
  });

  it("heatmapGrid：周对齐（周一首行）；首列以真实星期起格；跨月标注月份", () => {
    // 2026-01-04 是周日：lead 补 6 格，7 天占 2 列
    const sundayStart: { dayStart: number; count: number }[] = [];
    for (let i = 0; i < 7; i += 1) sundayStart.push({ dayStart: new Date(2026, 0, 4 + i).getTime(), count: i });
    const grid = heatmapGrid(sundayStart);
    expect(grid.cells).toHaveLength(7);
    expect(grid.columns).toBe(2);
    expect(grid.cells[0]).toMatchObject({ row: 6, column: 0, level: 0 });
    expect(grid.cells[1]).toMatchObject({ row: 0, column: 1, level: 1 }); // 01-05 周一
    expect(grid.cells[6]).toMatchObject({ row: 5, column: 1 }); // 01-10 周六
    expect(grid.monthLabels).toEqual([{ column: 0, label: "1月" }]);

    // 周一开始：无补位，单列排满 7 行
    const mondayStart = Array.from({ length: 7 }, (_, i) => ({
      dayStart: new Date(2026, 0, 5 + i).getTime(),
      count: 0,
    }));
    const grid2 = heatmapGrid(mondayStart);
    expect(grid2.columns).toBe(1);
    expect(grid2.cells[0]).toMatchObject({ row: 0, column: 0 });
    expect(grid2.cells[6]).toMatchObject({ row: 6, column: 0 });
    expect(grid2.monthLabels).toEqual([{ column: 0, label: "1月" }]);

    // 跨月：1 月底 → 2 月出现新标签
    const crossMonth = Array.from({ length: 35 }, (_, i) => ({
      dayStart: new Date(2026, 0, 5 + i).getTime(),
      count: 0,
    }));
    const grid3 = heatmapGrid(crossMonth);
    expect(grid3.monthLabels.some((entry) => entry.label === "2月")).toBe(true);
    expect(grid3.monthLabels[0]).toEqual({ column: 0, label: "1月" });
  });

  it("heatmapGrid：空序列返回空网格；heatmapCellLabel 文案含日期与完成数", () => {
    expect(heatmapGrid([])).toEqual({ cells: [], columns: 0, monthLabels: [] });
    const dayStart = new Date(2026, 8, 8).getTime();
    expect(heatmapCellLabel(dayStart, 3)).toBe("9月8日 · 完成 3 课时");
    expect(heatmapCellLabel(dayStart, 0)).toBe("9月8日 · 无学习记录");
  });

  it("365 天极端数据：全满（每天 1 课）与全空都能生成完整网格", () => {
    const full: LawProgressMap = {};
    for (let i = 0; i < 365; i += 1) {
      full[`xingfa-q${i}`] = {
        stepsDone: {},
        quizBest: 0,
        quizTotal: 0,
        wrongCount: 0,
        lastVisitedAt: 0,
        completedAt: daysAgoNoon(i),
      };
    }
    const fullSeries = heatmapCounts(full, 365, NOW);
    expect(fullSeries.every((day) => day.count === 1)).toBe(true);
    expect(heatmapLevel(Math.max(...fullSeries.map((day) => day.count)))).toBe(1);
    const fullGrid = heatmapGrid(fullSeries);
    expect(fullGrid.cells).toHaveLength(365);
    // 全空：365 格全为 0 级，网格仍完整
    const emptyGrid = heatmapGrid(heatmapCounts({}, 365, NOW));
    expect(emptyGrid.cells).toHaveLength(365);
    expect(emptyGrid.cells.every((cell) => cell.level === 0)).toBe(true);
  });
});
