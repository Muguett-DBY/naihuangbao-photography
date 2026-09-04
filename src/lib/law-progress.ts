import type { LawSubjectId } from "../types/law";
import { safeLocalStorage } from "./browser-storage";

const KEY = "nhb-law-academy-v1";
const EGG_KEY = "nhb-law-egg-v1";
const GOAL_KEY = "nhb-law-goal-v1";

export interface LawLessonProgress {
  stepsDone: Record<string, boolean>;
  quizBest: number;
  quizTotal: number;
  /** 错题（自测答错的次数） */
  wrongCount: number;
  /** 最近一次进入学习的时间 */
  lastVisitedAt: number;
  completedAt?: number;
  /** 最近一次答错的时间（间隔复习起点） */
  wrongAt?: number;
  /** 复习阶段：连续通过次数（0=刚答错待首次复习，毕业=REVIEW_INTERVALS.length） */
  reviewStage?: number;
  /** 下次应复习的时间戳（毕业或从未答错则为空） */
  reviewDueAt?: number;
}

export type LawProgressMap = Record<string, LawLessonProgress>;

interface LawProgressStore {
  version: 1;
  lessons: LawProgressMap;
  /** 最近学习的课时 id（继续学习用） */
  lastLessonId: string | null;
}

function readStore(): LawProgressStore {
  const raw = safeLocalStorage.getItem(KEY);
  if (!raw) return { version: 1, lessons: {}, lastLessonId: null };
  try {
    const parsed = JSON.parse(raw) as LawProgressStore;
    if (parsed?.version !== 1 || !parsed.lessons) return { version: 1, lessons: {}, lastLessonId: null };
    return parsed;
  } catch {
    return { version: 1, lessons: {}, lastLessonId: null };
  }
}

function writeStore(store: LawProgressStore) {
  safeLocalStorage.setItem(KEY, JSON.stringify(store));
}

export function getLawProgress(): LawProgressMap {
  return readStore().lessons;
}

export function getLessonProgress(lessonId: string): LawLessonProgress | null {
  return readStore().lessons[lessonId] ?? null;
}

export function touchLesson(lessonId: string): void {
  const store = readStore();
  const existing = store.lessons[lessonId];
  store.lessons[lessonId] = {
    stepsDone: existing?.stepsDone ?? {},
    quizBest: existing?.quizBest ?? 0,
    quizTotal: existing?.quizTotal ?? 0,
    wrongCount: existing?.wrongCount ?? 0,
    lastVisitedAt: Date.now(),
    completedAt: existing?.completedAt,
    wrongAt: existing?.wrongAt,
    reviewStage: existing?.reviewStage,
    reviewDueAt: existing?.reviewDueAt,
  };
  store.lastLessonId = lessonId;
  writeStore(store);
}

export function markStepDone(lessonId: string, stepId: string): number {
  const store = readStore();
  const entry = store.lessons[lessonId] ?? newEntry(lessonId);
  entry.stepsDone[stepId] = true;
  entry.lastVisitedAt = Date.now();
  store.lessons[lessonId] = entry;
  writeStore(store);
  return Object.keys(entry.stepsDone).length;
}

function newEntry(lessonId: string): LawLessonProgress {
  return {
    stepsDone: {},
    quizBest: 0,
    quizTotal: 0,
    wrongCount: 0,
    lastVisitedAt: Date.now(),
  };
}

/** 复习间隔（天）：答错后第 1/2/4/7/15 天复习，五次全对即毕业移出错题本 */
export const REVIEW_INTERVALS = [1, 2, 4, 7, 15];

const DAY_MS = 86_400_000;

export function recordQuiz(lessonId: string, correct: number, total: number, stepCount: number, wrong?: boolean): void {
  const store = readStore();
  const entry = store.lessons[lessonId] ?? newEntry(lessonId);
  entry.quizBest = Math.max(entry.quizBest, correct);
  entry.quizTotal = total;
  const now = Date.now();
  const passed = correct >= Math.ceil(total / 2);
  if (wrong) {
    // 答错：错题本建档/重置复习进度，明天安排第一次复习
    entry.wrongCount += 1;
    entry.wrongAt = now;
    entry.reviewStage = 0;
    entry.reviewDueAt = now + REVIEW_INTERVALS[0] * DAY_MS;
  } else if ((entry.wrongCount ?? 0) > 0 && (entry.reviewDueAt ?? 0) > 0) {
    // 错题复习通过：间隔翻倍式后延，五连过即毕业
    const stage = (entry.reviewStage ?? 0) + 1;
    entry.reviewStage = stage;
    if (stage >= REVIEW_INTERVALS.length) {
      entry.reviewDueAt = undefined;
    } else {
      entry.reviewDueAt = now + REVIEW_INTERVALS[stage] * DAY_MS;
    }
  }
  const allStepsDone = stepCount > 0 && Object.keys(entry.stepsDone).length >= stepCount;
  if (passed && allStepsDone && !entry.completedAt) {
    entry.completedAt = now;
    bumpTodayGoal();
  }
  store.lessons[lessonId] = entry;
  writeStore(store);
}

export function releaseLesson(lessonId: string): void {
  const store = readStore();
  const entry = store.lessons[lessonId];
  if (!entry) return;
  store.lastLessonId = lessonId;
  writeStore(store);
}

export function getLastLessonId(): string | null {
  return readStore().lastLessonId;
}

/** 今日目标：完成 3 课 */
interface GoalState {
  date: string;
  done: number;
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function readGoal(): GoalState {
  const raw = safeLocalStorage.getItem(GOAL_KEY);
  const current = { date: todayKey(), done: 0 };
  if (!raw) return current;
  try {
    const parsed = JSON.parse(raw) as GoalState;
    return parsed.date === current.date ? parsed : current;
  } catch {
    return current;
  }
}

function bumpTodayGoal(): void {
  const goal = readGoal();
  if (goal.date !== todayKey()) {
    goal.date = todayKey();
    goal.done = 1;
  } else {
    goal.done += 1;
  }
  safeLocalStorage.setItem(GOAL_KEY, JSON.stringify(goal));
}

export function getTodayGoal(): { done: number; target: number } {
  const goal = readGoal();
  return { done: goal.done, target: 3 };
}

/** 错题本：答错过但尚未毕业的课（最近答错的排前面） */
export function getWrongLessons(): string[] {
  const lessons = getLawProgress();
  return Object.entries(lessons)
    .filter(([, progress]) => (progress.wrongCount ?? 0) > 0 && progress.reviewDueAt !== undefined)
    .sort((a, b) => (b[1].wrongAt ?? 0) - (a[1].wrongAt ?? 0))
    .map(([id]) => id);
}

/** 今日到期的复习课（答错后到了该再测的时间），最早到期的排前面 */
export function getDueReviewLessons(now: number = Date.now()): string[] {
  const lessons = getLawProgress();
  return Object.entries(lessons)
    .filter(([, progress]) => (progress.reviewDueAt ?? Number.POSITIVE_INFINITY) <= now)
    .sort((a, b) => (a[1].reviewDueAt ?? 0) - (b[1].reviewDueAt ?? 0))
    .map(([id]) => id);
}

/** 错题复习信息（供展示：阶段/到期时间），非错题返回 null */
export function getReviewInfo(lessonId: string): { stage: number; dueAt: number } | null {
  const progress = getLessonProgress(lessonId);
  if (!progress || (progress.wrongCount ?? 0) === 0 || progress.reviewDueAt === undefined) return null;
  return { stage: progress.reviewStage ?? 0, dueAt: progress.reviewDueAt };
}

/** ── 彩蛋状态 ── */

export type EggTrigger =
  | "midnight"
  | "morning"
  | "firstLesson"
  | "hundred"
  | "streak3"
  | "wrongbook3"
  | "graphicFirst"
  | "exam30"
  | "christmas"
  | "symbol";

/** 连续学习天数：按"完成课时"的日期从今天/昨天向前连续计数 */
export function getStreakDays(): number {
  const lessons = readStore().lessons;
  const days = new Set<string>();
  for (const lesson of Object.values(lessons)) {
    if (!lesson.completedAt) continue;
    const d = new Date(lesson.completedAt);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  const cursor = new Date();
  const keyOf = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  if (!days.has(keyOf(cursor))) {
    // 今天还没完成也允许（延续到昨天）
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (days.has(keyOf(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

interface EggState {
  unlocked: Record<string, boolean>;
  /** 首次彩蛋展示时间戳 */
  seenAt: Record<string, number>;
}

function readEggs(): EggState {
  const raw = safeLocalStorage.getItem(EGG_KEY);
  if (!raw) return { unlocked: {}, seenAt: {} };
  try {
    const parsed = JSON.parse(raw) as EggState;
    return { unlocked: parsed.unlocked ?? {}, seenAt: parsed.seenAt ?? {} };
  } catch {
    return { unlocked: {}, seenAt: {} };
  }
}

function writeEggs(state: EggState) {
  safeLocalStorage.setItem(EGG_KEY, JSON.stringify(state));
}

export function unlockEgg(trigger: EggTrigger): boolean {
  const state = readEggs();
  if (state.unlocked[trigger]) return false;
  state.unlocked[trigger] = true;
  writeEggs(state);
  return true;
}

export function markEggSeen(trigger: EggTrigger): void {
  const state = readEggs();
  state.seenAt[trigger] = Date.now();
  writeEggs(state);
}

export function wasEggSeen(trigger: EggTrigger): boolean {
  return readEggs().seenAt[trigger] !== undefined;
}

export function isLateNight(): boolean {
  const hour = new Date().getHours();
  return hour >= 23 || hour < 5;
}

export function subjectStats(
  counts: Partial<Record<string, number>>,
): Record<LawSubjectId, { done: number; total: number; tried: number }> {
  const stats = {} as Record<LawSubjectId, { done: number; total: number; tried: number }>;
  const lessons = getLawProgress();
  const subjectOf = (lessonId: string): LawSubjectId | null => {
    const match = /^([a-z]+)-q/.exec(lessonId);
    return (match?.[1] as LawSubjectId | undefined) ?? null;
  };
  const ids = [...new Set(Object.keys(lessons).map(subjectOf).filter(Boolean))] as LawSubjectId[];
  for (const id of ids) {
    const total = counts[id] ?? 0;
    let done = 0;
    let tried = 0;
    for (const [lessonId, progress] of Object.entries(lessons)) {
      if (subjectOf(lessonId) !== id) continue;
      tried += 1;
      if (progress.completedAt) done += 1;
    }
    stats[id] = { done, total, tried };
  }
  return stats;
}

export function isLessonCompleted(lessonId: string, stepCount: number): boolean {
  const progress = getLessonProgress(lessonId);
  return progress?.completedAt !== undefined;
}
