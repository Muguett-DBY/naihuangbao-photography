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
  visitedAt: number;
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
    visitedAt: Date.now(),
  };
  store.lastLessonId = lessonId;
  writeStore(store);
}

export function markStepDone(lessonId: string, stepId: string): number {
  const store = readStore();
  const entry = store.lessons[lessonId] ?? {
    stepsDone: {},
    quizBest: 0,
    quizTotal: 0,
    wrongCount: 0,
    visitedAt: Date.now(),
  };
  entry.stepsDone[stepId] = true;
  if (!entry.visitedAt) entry.visitedAt = Date.now();
  entry.lastVisitedAt = Date.now();
  store.lessons[lessonId] = entry;
  writeStore(store);
  return Object.keys(entry.stepsDone).length;
}

export function recordQuiz(lessonId: string, correct: number, total: number, stepCount: number, wrong?: boolean): void {
  const store = readStore();
  const entry = store.lessons[lessonId] ?? {
    stepsDone: {},
    quizBest: 0,
    quizTotal: 0,
    wrongCount: 0,
    visitedAt: Date.now(),
  };
  entry.quizBest = Math.max(entry.quizBest, correct);
  entry.quizTotal = total;
  if (wrong) entry.wrongCount += 1;
  const allStepsDone = stepCount > 0 && Object.keys(entry.stepsDone).length >= stepCount;
  if (correct >= Math.ceil(total / 2) && allStepsDone && !entry.completedAt) {
    entry.completedAt = Date.now();
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

/** 错题本 */
export function getWrongLessons(): string[] {
  const lessons = getLawProgress();
  return Object.entries(lessons)
    .filter(([, progress]) => (progress.wrongCount ?? 0) > 0)
    .sort((a, b) => (b[1].lastVisitedAt ?? 0) - (a[1].lastVisitedAt ?? 0))
    .map(([id]) => id);
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
