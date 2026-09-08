import { safeLocalStorage } from "./browser-storage";

/**
 * 逐日学习活动记录（S6·T2）：柱状图"真实逐日步数"口径的数据源。
 *
 * 口径说明（铁律3）：
 * - 独立存储键 nhb-law-history-v1，与 nhb-law-academy-v1（课时进度）完全解耦；
 * - 追加式：只按自然日累加计数，不删不改历史日；只采集学习步数/课时数/日期，
 *   不含任何作答内容或个人输入；
 * - 写入时机：markStepDone 里"新完成一步"记 1 步；recordQuiz 判定课时完成的
 *   同一事务记 1 课（跨文件单行埋点，见 law-progress.ts）；
 * - 向后兼容：旧数据没有逐日历史（首日为基线起点，不算丢失）——统计页在
 *   历史覆盖不到的日子回退旧口径（completedAt 归集）渲染，见 dailyActivity.ts。
 */

const KEY = "nhb-law-history-v1";

/** 单日学习活动（d 为本地时区自然日键，与 law-progress 的 todayKey 同构） */
export interface LawHistoryDay {
  /** 自然日键，如 "2026-9-9" */
  d: string;
  /** 当日新完成的步数 */
  s: number;
  /** 当日完成的课时数 */
  l: number;
  /** 该日最后一次写入的时间戳（ms，调试/排序用） */
  t: number;
}

/** 存储上限：保留最近约一年，防止无限增长 */
const MAX_DAYS = 400;

function dayKeyOf(ts: number): string {
  const date = new Date(ts);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function readAll(): LawHistoryDay[] {
  const raw = safeLocalStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is LawHistoryDay =>
        typeof entry === "object" && entry !== null && typeof (entry as LawHistoryDay).d === "string",
    );
  } catch {
    return [];
  }
}

function writeAll(days: LawHistoryDay[]): void {
  const trimmed = days.length > MAX_DAYS ? days.slice(days.length - MAX_DAYS) : days;
  safeLocalStorage.setItem(KEY, JSON.stringify(trimmed));
}

function bump(field: "s" | "l", now: number): void {
  const days = readAll();
  const key = dayKeyOf(now);
  let day = days.find((entry) => entry.d === key);
  if (!day) {
    day = { d: key, s: 0, l: 0, t: now };
    days.push(day);
  }
  // 存量条目若缺字段（历史脏数据），先归零再累加，防 undefined+1=NaN 写回
  day[field] = (typeof day[field] === "number" && Number.isFinite(day[field]) ? day[field] : 0) + 1;
  day.t = now;
  writeAll(days);
}

/** 学习步完成埋点（markStepDone 仅在新完成一步时调用，重复勾选不重复计） */
export function recordLawStepDone(now: number = Date.now()): void {
  bump("s", now);
}

/** 课时完成埋点（recordQuiz 判定 completed=true 的同一时机调用） */
export function recordLawLessonDone(now: number = Date.now()): void {
  bump("l", now);
}

/** 全量逐日历史（按写入顺序，即时间升序）；无历史时返回空数组（调用方回退旧口径） */
export function getLawHistory(): LawHistoryDay[] {
  return readAll();
}

/** 自然日键（导出给统计页对齐柱状图窗口用） */
export function lawHistoryDayKey(ts: number): string {
  return dayKeyOf(ts);
}

/** 测试专用：清空逐日历史（铁律5：测试注入的 localStorage 必须清理） */
export function resetLawHistoryForTest(): void {
  safeLocalStorage.removeItem(KEY);
}
