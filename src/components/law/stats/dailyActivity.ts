import type { LawLessonProgress } from "../../../lib/law-progress";

export interface DailyActivity {
  /** 当天本地 0 点时间戳 */
  dayStart: number;
  /** 当天完成的课时数（completedAt 落在当天） */
  lessons: number;
  /**
   * 当天完成课时所包含的已学步数。存储里 stepsDone 没有逐日时间戳，
   * 因此按"完成该课时的当天"归集其步数（口径决策见会话 B 工作日志）。
   */
  steps: number;
}

function startOfDay(ts: number): number {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** 近 N 天每日完成情况（旧→新，最后一天是今天），供柱状图直接渲染 */
export function dailyActivity(
  lessons: Record<string, LawLessonProgress>,
  days: number = 30,
  now: number = Date.now(),
): DailyActivity[] {
  const today = startOfDay(now);
  const dayMs = 86_400_000;
  const byDay = new Map<number, { lessons: number; steps: number }>();
  for (const progress of Object.values(lessons)) {
    if (!progress.completedAt) continue;
    const key = startOfDay(progress.completedAt);
    if (key < today - (days - 1) * dayMs) continue;
    const bucket = byDay.get(key) ?? { lessons: 0, steps: 0 };
    bucket.lessons += 1;
    bucket.steps += Object.keys(progress.stepsDone ?? {}).length;
    byDay.set(key, bucket);
  }
  const series: DailyActivity[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = today - i * dayMs;
    const bucket = byDay.get(dayStart);
    series.push({ dayStart, lessons: bucket?.lessons ?? 0, steps: bucket?.steps ?? 0 });
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
