import type { LawProgressMap } from "../../../lib/law-progress";

/**
 * 学习热力图数据引擎（纯函数）：GitHub 风格贡献格的数据侧。
 * - 口径（与任务书一致）：law-progress 的 completedAt 按本地自然日聚合，每日完成课时数；
 * - 色深 5 级：0 / 1 / 2-3 / 4-6 / ≥7；
 * - 网格按「周一 → 周日」分行、按周分列，首列以 null 补齐对齐，末列止于今天。
 */

export type HeatmapRange = 30 | 90 | 365;

export interface HeatmapDay {
  /** 当日本地 0 点时间戳 */
  dayStart: number;
  /** 当日完成的课时数 */
  count: number;
}

/** 色深级别：0=空白 1=1 课 2=2-3 课 3=4-6 课 4=≥7 课 */
export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export function heatmapLevel(count: number): HeatmapLevel {
  if (count >= 7) return 4;
  if (count >= 4) return 3;
  if (count >= 2) return 2;
  if (count >= 1) return 1;
  return 0;
}

export function startOfDay(ts: number): number {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** 本地日历回退 i 个自然日（跨夏令时安全：精确毫秒步进会漂移出错误的自然日） */
function dayStartAgo(today: number, i: number): number {
  const date = new Date(today);
  date.setDate(date.getDate() - i);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** 近 days 天的每日完成课时数（旧→新，最后一天是今天） */
export function heatmapCounts(progress: LawProgressMap, days: HeatmapRange, now: number): HeatmapDay[] {
  const today = startOfDay(now);
  const windowStart = dayStartAgo(today, days - 1);
  const byDay = new Map<number, number>();
  for (const entry of Object.values(progress)) {
    if (!entry.completedAt) continue;
    const key = startOfDay(entry.completedAt);
    if (key < windowStart || key > today) continue;
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const series: HeatmapDay[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = dayStartAgo(today, i);
    series.push({ dayStart, count: byDay.get(dayStart) ?? 0 });
  }
  return series;
}

export interface HeatmapCell {
  dayStart: number;
  count: number;
  level: HeatmapLevel;
  /** 周列（0 = 第一列） */
  column: number;
  /** 周内行（0 = 周一 … 6 = 周日） */
  row: number;
}

export interface HeatmapGrid {
  cells: HeatmapCell[];
  columns: number;
  /** 月份标签：在该列第一格上方标注「M月」 */
  monthLabels: { column: number; label: string }[];
}

/** 行序：周一=0 … 周日=6 */
function rowOfDay(dayStart: number): number {
  return (new Date(dayStart).getDay() + 6) % 7;
}

/** 把日序列折成周对齐网格；首列不足一周的部分不渲染格子（row 从真实星期开始） */
export function heatmapGrid(series: HeatmapDay[]): HeatmapGrid {
  if (series.length === 0) return { cells: [], columns: 0, monthLabels: [] };
  const lead = rowOfDay(series[0].dayStart);
  const cells: HeatmapCell[] = [];
  const monthLabels: { column: number; label: string }[] = [];
  let lastMonth = -1;
  const total = lead + series.length;
  for (let i = 0; i < total; i += 1) {
    const column = Math.floor(i / 7);
    const row = i % 7;
    if (i < lead) {
      // 首列补位：仍检查月份标签（与第一格同月时只标一次）
      continue;
    }
    const day = series[i - lead];
    if (row === 0 || column === 0) {
      const month = new Date(day.dayStart).getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ column, label: `${month + 1}月` });
        lastMonth = month;
      }
    }
    cells.push({ dayStart: day.dayStart, count: day.count, level: heatmapLevel(day.count), column, row });
  }
  return { cells, columns: Math.ceil(total / 7), monthLabels };
}

/** 悬停/读屏文案：9月8日 · 完成 3 课时 */
export function heatmapCellLabel(dayStart: number, count: number): string {
  const date = new Date(dayStart);
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${count > 0 ? `完成 ${count} 课时` : "无学习记录"}`;
}
