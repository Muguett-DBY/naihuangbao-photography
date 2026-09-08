import type { LawSubjectId } from "../types/law";
import { safeLocalStorage } from "./browser-storage";
import { recordLawLessonDone, recordLawStepDone } from "./law-history";
import { tallyWrongTags, type LawWrongTag, type QuizWrongDetail } from "./law-wrong-tags";

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
  /** 错因标签计数（T3：按题型+错误模式推导，向后兼容的可选字段） */
  wrongTags?: Partial<Record<LawWrongTag, number>>;
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
    wrongTags: existing?.wrongTags,
  };
  store.lastLessonId = lessonId;
  writeStore(store);
}

export function markStepDone(lessonId: string, stepId: string): number {
  const store = readStore();
  const entry = store.lessons[lessonId] ?? newEntry(lessonId);
  const isNewStep = !entry.stepsDone[stepId]; // S6·T2：重复勾选不重复计步
  entry.stepsDone[stepId] = true;
  entry.lastVisitedAt = Date.now();
  store.lessons[lessonId] = entry;
  writeStore(store);
  if (isNewStep) recordLawStepDone(); // S6·T2 逐日活动埋点（单行 diff，见 worklog-S6）
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

/** 复习间隔基础值（天）：实际间隔 = 基础 × 难度系数（law-review 自适应算法，T4）。
 *  保留本导出：错题本"第 N/5 轮"等既有口径消费它，阶段/毕业语义不变。 */
export { BASE_REVIEW_INTERVALS as REVIEW_INTERVALS } from "./law-review";

import { BASE_REVIEW_INTERVALS, nextReviewDueAt } from "./law-review";

/** recordQuiz 的可选参数（导出供调用方标注错题明细类型） */
export interface RecordQuizOpts {
  skipped?: boolean;
  wrongDetails?: QuizWrongDetail[];
}

export function recordQuiz(
  lessonId: string,
  correct: number,
  total: number,
  stepCount: number,
  opts: RecordQuizOpts = {},
): void {
  const store = readStore();
  const entry = store.lessons[lessonId] ?? newEntry(lessonId);
  const now = Date.now();
  // 及格线 = 答对一半；跳过自测视为直接掌握（但不动错题本）
  const passed = opts.skipped || correct >= Math.ceil(total / 2);
  let wrongBookChanged = false;
  let graduated = false;
  if (!opts.skipped) {
    entry.quizBest = Math.max(entry.quizBest ?? 0, correct);
    entry.quizTotal = total;
  }
  // 错因标签：每次作答的错题明细按题型/陷阱聚合计数（及格与否都记——"错在哪"是复习输入）
  if (!opts.skipped && opts.wrongDetails && opts.wrongDetails.length > 0) {
    const tags = { ...(entry.wrongTags ?? {}) };
    for (const [tag, count] of Object.entries(tallyWrongTags(opts.wrongDetails))) {
      const key = tag as LawWrongTag;
      tags[key] = (tags[key] ?? 0) + count;
    }
    entry.wrongTags = tags;
  }
  if (!opts.skipped && !passed) {
    // 不及格：错题本建档/重置复习进度，第一次复习按难度系数自适应安排（T4）
    entry.wrongCount += 1;
    entry.wrongAt = now;
    entry.reviewStage = 0;
    entry.reviewDueAt = nextReviewDueAt(0, entry, now);
    wrongBookChanged = true;
  } else if (!opts.skipped && (entry.wrongCount ?? 0) > 0 && (entry.reviewDueAt ?? 0) > 0) {
    // 错题复习通过：间隔 = 基础 × 难度系数，五连过即毕业
    const stage = (entry.reviewStage ?? 0) + 1;
    entry.reviewStage = stage;
    if (stage >= BASE_REVIEW_INTERVALS.length) {
      entry.reviewDueAt = undefined;
      graduated = true;
    } else {
      entry.reviewDueAt = nextReviewDueAt(stage, entry, now);
    }
  }
  const allStepsDone = stepCount > 0 && Object.keys(entry.stepsDone).length >= stepCount;
  let completed = false;
  if (passed && allStepsDone && !entry.completedAt) {
    entry.completedAt = now;
    bumpTodayGoal();
    recordLawLessonDone(now); // S6·T2 逐日活动埋点（完成时机，与 completedAt 同一事务）
    completed = true;
  }
  store.lessons[lessonId] = entry;
  writeStore(store);
  // 彩蛋相关的进度变化即时广播：挂载中的 LawEggListener 立刻重查（而不是等下次进页面）
  if (wrongBookChanged || graduated || completed) emitProgressEvent();
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

/** 最近到访且未完成的课（断点续学的首选目标）：lastVisitedAt 最新且尚未标记掌握；无则 null */
export function getRecentUnfinishedLesson(): string | null {
  let best: { id: string; at: number } | null = null;
  for (const [id, progress] of Object.entries(readStore().lessons)) {
    if (progress.completedAt) continue;
    if (!progress.lastVisitedAt) continue;
    if (!best || progress.lastVisitedAt > best.at) best = { id, at: progress.lastVisitedAt };
  }
  return best?.id ?? null;
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

/** 已从错题本毕业的课时数（五次复习全部通过），错题毕业彩蛋的判定输入 */
export function getGraduatedWrongCount(): number {
  const lessons = getLawProgress();
  return Object.values(lessons).filter(
    (progress) =>
      (progress.wrongCount ?? 0) > 0 &&
      progress.reviewDueAt === undefined &&
      (progress.reviewStage ?? 0) >= BASE_REVIEW_INTERVALS.length,
  ).length;
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
  | "streak7"
  | "wrongbook3"
  | "wrongGraduate"
  | "pathHalf"
  | "bookDone"
  | "graphicFirst"
  | "exam30"
  | "christmas"
  | "symbol";

/** 进度事件（document CustomEvent）：错题建档/毕业/课时完成时派发，彩蛋监听即时重查 */
export const LAW_PROGRESS_EVENT = "nhb-law-progress";

/** 彩蛋解锁事件：图鉴入口计数等 UI 即时刷新用 */
export const LAW_EGG_UNLOCKED_EVENT = "nhb-law-egg-unlocked";

function emitDomEvent(name: string): void {
  if (typeof document === "undefined" || typeof document.dispatchEvent !== "function") return;
  if (typeof CustomEvent !== "function") return;
  document.dispatchEvent(new CustomEvent(name));
}

function emitProgressEvent(): void {
  emitDomEvent(LAW_PROGRESS_EVENT);
}

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
  /** 首次解锁时间戳（图鉴展示用；旧数据可能缺失） */
  unlockedAt: Record<string, number>;
}

function readEggs(): EggState {
  const raw = safeLocalStorage.getItem(EGG_KEY);
  if (!raw) return { unlocked: {}, seenAt: {}, unlockedAt: {} };
  try {
    const parsed = JSON.parse(raw) as EggState;
    return { unlocked: parsed.unlocked ?? {}, seenAt: parsed.seenAt ?? {}, unlockedAt: parsed.unlockedAt ?? {} };
  } catch {
    return { unlocked: {}, seenAt: {}, unlockedAt: {} };
  }
}

function writeEggs(state: EggState): void {
  safeLocalStorage.setItem(EGG_KEY, JSON.stringify(state));
}

export function unlockEgg(trigger: EggTrigger): boolean {
  const state = readEggs();
  if (state.unlocked[trigger]) return false;
  state.unlocked[trigger] = true;
  state.unlockedAt[trigger] = Date.now();
  writeEggs(state);
  emitDomEvent(LAW_EGG_UNLOCKED_EVENT);
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

/** 彩蛋全量状态（图鉴用）：解锁集合 + 解锁/查看时间 */
export function getEggState(): {
  unlocked: Partial<Record<EggTrigger, boolean>>;
  unlockedAt: Partial<Record<EggTrigger, number>>;
  seenAt: Partial<Record<EggTrigger, number>>;
} {
  const state = readEggs();
  return { unlocked: state.unlocked, unlockedAt: state.unlockedAt, seenAt: state.seenAt };
}

/** 已解锁彩蛋集合（供彩蛋判定的纯函数读取） */
export function getUnlockedEggs(): Partial<Record<EggTrigger, boolean>> {
  return readEggs().unlocked;
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
