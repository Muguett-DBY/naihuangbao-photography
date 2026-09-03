import type { LawSubjectId } from "../types/law";
import { safeLocalStorage } from "./browser-storage";

const KEY = "nhb-law-academy-v1";

export interface LawLessonProgress {
  stepsDone: Record<string, boolean>;
  quizBest: number;
  quizTotal: number;
  completedAt?: number;
  visitedAt: number;
}

export type LawProgressMap = Record<string, LawLessonProgress>;

interface LawProgressStore {
  version: 1;
  lessons: LawProgressMap;
}

function readStore(): LawProgressStore {
  const raw = safeLocalStorage.getItem(KEY);
  if (!raw) return { version: 1, lessons: {} };
  try {
    const parsed = JSON.parse(raw) as LawProgressStore;
    if (parsed?.version !== 1 || !parsed.lessons) return { version: 1, lessons: {} };
    return parsed;
  } catch {
    return { version: 1, lessons: {} };
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
    completedAt: existing?.completedAt,
    visitedAt: Date.now(),
  };
  writeStore(store);
}

export function markStepDone(lessonId: string, stepId: string): number {
  const store = readStore();
  const entry = store.lessons[lessonId] ?? {
    stepsDone: {},
    quizBest: 0,
    quizTotal: 0,
    visitedAt: Date.now(),
  };
  entry.stepsDone[stepId] = true;
  if (!entry.visitedAt) entry.visitedAt = Date.now();
  store.lessons[lessonId] = entry;
  writeStore(store);
  return Object.keys(entry.stepsDone).length;
}

export function recordQuiz(lessonId: string, correct: number, total: number, stepCount: number): void {
  const store = readStore();
  const entry = store.lessons[lessonId] ?? {
    stepsDone: {},
    quizBest: 0,
    quizTotal: 0,
    visitedAt: Date.now(),
  };
  entry.quizBest = Math.max(entry.quizBest, correct);
  entry.quizTotal = total;
  const allStepsDone = stepCount > 0 && Object.keys(entry.stepsDone).length >= stepCount;
  if (correct >= Math.ceil(total / 2) && allStepsDone && !entry.completedAt) {
    entry.completedAt = Date.now();
  }
  store.lessons[lessonId] = entry;
  writeStore(store);
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
  if (!progress) return false;
  return progress.completedAt !== undefined;
}
