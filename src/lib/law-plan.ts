import lawStats from "../data/law/stats.json";
import { safeLocalStorage } from "./browser-storage";

/** 2027 法硕考研初试（12 月下旬最后一个周末，可调） */
export const EXAM_DATE = new Date("2026-12-26T00:00:00");

/** 考试日期的本地 ISO 形式（"2026-12-26"），供展示与比较；改动日期只改 EXAM_DATE 一处 */
export function examDateISO(): string {
  const y = EXAM_DATE.getFullYear();
  const m = String(EXAM_DATE.getMonth() + 1).padStart(2, "0");
  const d = String(EXAM_DATE.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type PlanTier = "relaxed" | "standard" | "intense";

interface PlanStats {
  [key: string]: { lessonCount: number; chapterTitles: string[]; steps?: number };
}

const stats = lawStats as PlanStats;

export function subjectSteps(subject: string): number {
  return stats[subject]?.steps ?? 0;
}

export function totalSteps(): number {
  return Object.values(stats).reduce((sum, item) => sum + (item.steps ?? 0), 0);
}

function daysLeft(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.ceil((EXAM_DATE.getTime() - start.getTime()) / 86_400_000));
}

/** 已学步数（所有课已完成的步骤之和） */
export function doneSteps(): number {
  const raw = safeLocalStorage.getItem("nhb-law-academy-v1");
  if (!raw) return 0;
  try {
    const store = JSON.parse(raw) as {
      lessons?: Record<string, { stepsDone?: Record<string, boolean> }>;
    };
    return Object.values(store.lessons ?? {}).reduce(
      (sum, lesson) => sum + Object.keys(lesson.stepsDone ?? {}).length,
      0,
    );
  } catch {
    return 0;
  }
}

const TIER_KEY = "nhb-law-plan-tier";
const SNAPSHOT_KEY = "nhb-law-plan-snapshot";

export function getPlanTier(): PlanTier {
  const tier = safeLocalStorage.getItem(TIER_KEY);
  return tier === "relaxed" || tier === "intense" ? tier : "standard";
}

export function setPlanTier(tier: PlanTier): void {
  safeLocalStorage.setItem(TIER_KEY, tier);
}

interface Snapshot {
  date: string;
  doneAtStart: number;
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export interface LawPlan {
  daysLeft: number;
  totalSteps: number;
  doneSteps: number;
  remainingSteps: number;
  /** 每日建议步数（三档） */
  dailyTarget: number;
  /** 今日已完成步数 */
  todayDone: number;
  /** 今日目标完成度 */
  todayPercent: number;
  /** 按当前节奏的预计学完日（ISO 字符串，null=已学完） */
  finishEstimate: string | null;
  tier: PlanTier;
}

export function getPlan(): LawPlan {
  const raw = safeLocalStorage.getItem(SNAPSHOT_KEY);
  let snapshot: Snapshot | null = null;
  try {
    if (raw) snapshot = JSON.parse(raw) as Snapshot;
  } catch {
    snapshot = null;
  }
  const key = todayKey();
  if (!snapshot || snapshot.date !== key) {
    snapshot = { date: key, doneAtStart: doneSteps() };
    safeLocalStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  }

  const total = totalSteps();
  const done = doneSteps();
  const remaining = Math.max(0, total - done);
  const days = Math.max(1, daysLeft());
  const tier = getPlanTier();
  const divisor = tier === "relaxed" ? days * 1.6 : tier === "intense" ? Math.max(1, (days - 20) * 0.85) : days;
  const dailyTarget = Math.min(460, Math.max(8, Math.ceil(remaining / Math.max(1, divisor))));
  const todayDone = Math.max(0, done - (snapshot.doneAtStart ?? 0));

  // 学完估计：从今天起按每日目标推进
  const finishEstimate = (() => {
    if (remaining <= 0) return null;
    if (dailyTarget <= 0) return null;
    const extraDays = Math.ceil((remaining - todayDone) / dailyTarget);
    const date = new Date();
    date.setDate(date.getDate() + Math.max(0, extraDays));
    return date.toISOString().slice(0, 10);
  })();

  return {
    daysLeft: daysLeft(),
    totalSteps: total,
    doneSteps: done,
    remainingSteps: remaining,
    dailyTarget,
    todayDone,
    todayPercent: Math.min(100, Math.round((todayDone / dailyTarget) * 100)),
    finishEstimate,
    tier,
  };
}
