import type { LawLessonProgress } from "../../../lib/law-progress";
import { lawHistoryDayKey, type LawHistoryDay } from "../../../lib/law-history";

export interface DailyActivity {
  /** 当天本地 0 点时间戳 */
  dayStart: number;
  /** 当天完成的课时数 */
  lessons: number;
  /**
   * 当天步数。历史覆盖到的日子 = 真实逐日步数（S6·T2）；
   * 历史覆盖不到的日子（口径升级前）按旧口径归集：完成该课时的当天计入其全部步数。
   */
  steps: number;
  /** true = 来自逐日活动记录（真实步数）；false = 旧口径回退（completedAt 归集） */
  fromHistory: boolean;
}

function startOfDay(ts: number): number {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** 近 N 天每日完成情况（旧→新，最后一天是今天），供柱状图直接渲染。
 *  无逐日历史时的纯旧口径（completedAt 归集）——保留为兼容入口与回退路径。 */
export function dailyActivity(
  lessons: Record<string, LawLessonProgress>,
  days: number = 30,
  now: number = Date.now(),
): DailyActivity[] {
  return dailyActivityWindow(lessons, new Map(), days, now);
}

/**
 * 近 N 天每日完成情况（S6·T2 口径升级）：
 * - 逐日历史覆盖到的日子：课时数/步数取真实记录（fromHistory=true）；
 * - 历史开始之前的日子（老用户的存量数据，首日为基线不算丢失）：回退旧口径
 *   （completedAt 当日课时数 + 其步数归集，fromHistory=false）；
 * - 完全没有历史数据时整体等价旧口径（向后兼容）。
 */
export function dailyActivityWithHistory(
  lessons: Record<string, LawLessonProgress>,
  history: LawHistoryDay[],
  days: number = 30,
  now: number = Date.now(),
): DailyActivity[] {
  const historyByDay = new Map<string, LawHistoryDay>();
  for (const entry of history) historyByDay.set(entry.d, entry);
  return dailyActivityWindow(lessons, historyByDay, days, now);
}

function dailyActivityWindow(
  lessons: Record<string, LawLessonProgress>,
  historyByDay: Map<string, LawHistoryDay>,
  days: number,
  now: number,
): DailyActivity[] {
  const today = startOfDay(now);
  const dayMs = 86_400_000;
  const byDay = new Map<number, { lessons: number; steps: number }>();
  for (const progress of Object.values(lessons)) {
    if (!progress.completedAt) continue;
    const key = startOfDay(progress.completedAt);
    if (key < today - (days - 1) * dayMs) continue;
    // 该日已有真实历史记录时不再用旧口径重复计数（历史是唯一事实源）
    if (historyByDay.has(lawHistoryDayKey(key))) continue;
    const bucket = byDay.get(key) ?? { lessons: 0, steps: 0 };
    bucket.lessons += 1;
    bucket.steps += Object.keys(progress.stepsDone ?? {}).length;
    byDay.set(key, bucket);
  }
  const series: DailyActivity[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = today - i * dayMs;
    const recorded = historyByDay.get(lawHistoryDayKey(dayStart));
    if (recorded) {
      series.push({ dayStart, lessons: recorded.l, steps: recorded.s, fromHistory: true });
      continue;
    }
    const bucket = byDay.get(dayStart);
    series.push({ dayStart, lessons: bucket?.lessons ?? 0, steps: bucket?.steps ?? 0, fromHistory: false });
  }
  return series;
}

/** 累计学习天数：完成过课时的自然日去重计数 */
export function countStudyDays(lessons: Record<string, LawLessonProgress>): number {
  const days = new Set<number>();
  for (const progress of Object.values(lessons)) {
    if (!progress.completedAt) continue;
    days.add(startOfDay(progress.completedAt));
  }
  return days.size;
}

/** 柱状图日期刻度：9/8 形式 */
export function formatDayLabel(dayStart: number): string {
  const date = new Date(dayStart);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
