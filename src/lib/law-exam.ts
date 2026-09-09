import type { LawLesson, LawQuizItem, LawSubjectId } from "../types/law";
import type { LawProgressMap } from "./law-progress";
import { buildQuiz, hashSeed } from "./law-quiz";
import { fillMatches } from "./law-quiz-fill";

/** 每题作答时长（秒）：总倒计时 = 题量 × 该值，到时自动交卷 */
export const EXAM_SECONDS_PER_QUESTION = 45;

/** 每课最多取几题（选题策略的上限：宁可少而广，不往一课里连抽） */
const MAX_ITEMS_PER_LESSON = 2;

/** 考试题型过滤全集（顺序即配置面板展示顺序） */
export const EXAM_KINDS = ["mcq", "judge", "fill", "order", "multi"] as const;
export type LawExamKind = (typeof EXAM_KINDS)[number];

/** 组卷素材：一节已完成课 + 它的同章干扰词（与课时页 siblingTerms 同口径） */
export interface LawExamLessonInput {
  subject: LawSubjectId;
  lesson: LawLesson;
  siblingTerms: string[];
}

/** 带出处的考试题：自测题 + 学科/课时溯源（结果页错题回链、按科目计分都靠它） */
export type LawExamItem = LawQuizItem & {
  subject: LawSubjectId;
  lessonId: string;
  lessonTitle: string;
};

export interface LawExamOptions {
  /** 参考科目（默认五科全选） */
  subjects?: LawSubjectId[];
  /** 目标题量（默认 10；池子不足时给全部可出的题） */
  count?: number;
  /** 题型过滤（默认全题型） */
  kinds?: LawExamKind[];
  /** 洗牌种子（默认按时间，测试传固定值保证可复现） */
  seed?: number;
}

/** 作答值：mcq/judge/fill 是字符串，multi/order 是序列 */
export type LawExamAnswer = string | string[];

export interface LawExamSubjectScore {
  correct: number;
  total: number;
}

/** 结果页错题条目：题目 + 用户作答的展示串（未作答为 null） */
export interface LawExamWrong {
  item: LawExamItem;
  userAnswer: string | null;
}

export interface LawExamGrade {
  total: number;
  correct: number;
  bySubject: Partial<Record<LawSubjectId, LawExamSubjectScore>>;
  wrong: LawExamWrong[];
}

/** 从课时 id 反推学科（与 law-progress.subjectStats 同一口径） */
function subjectOfLessonId(lessonId: string): LawSubjectId | null {
  const subject = lessonId.split("-q", 1)[0];
  return (subject as LawSubjectId) || null;
}

/**
 * 已完成课池：只认 completedAt 存在的课（掌握口径），按完成时间倒序（最近掌握的优先进卷），
 * 按科目分组返回。导览课（-tour）不出题，天然被 buildQuiz 过滤，这里不重复判。
 */
export function completedLessonsBySubject(
  progress: LawProgressMap,
  subjects: LawSubjectId[],
): Partial<Record<LawSubjectId, string[]>> {
  const groups: Partial<Record<LawSubjectId, { id: string; at: number }[]>> = {};
  const wanted = new Set(subjects);
  for (const [lessonId, entry] of Object.entries(progress)) {
    if (!entry?.completedAt) continue;
    const subject = subjectOfLessonId(lessonId);
    if (!subject || !wanted.has(subject)) continue;
    (groups[subject] ??= []).push({ id: lessonId, at: entry.completedAt });
  }
  const out: Partial<Record<LawSubjectId, string[]>> = {};
  for (const [subject, list] of Object.entries(groups)) {
    out[subject as LawSubjectId] = list
      .sort((a, b) => b.at - a.at)
      .map((entry) => entry.id);
  }
  return out;
}

/** 跨科目轮转：每科轮流出一条（保持各科内部的倒序），保证多科时前段题目科目均匀 */
export function interleaveBySubject(groups: Partial<Record<LawSubjectId, string[]>>): string[] {
  const queues = Object.values(groups).filter((list) => list && list.length > 0) as string[][];
  const out: string[] = [];
  let cursor = 0;
  while (queues.some((queue) => queue.length > 0)) {
    const queue = queues[cursor % queues.length];
    cursor += 1;
    const id = queue.shift();
    if (id) out.push(id);
  }
  return out;
}

function shuffled<T>(list: T[], rand: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 组卷：对每课调 buildQuiz（确定性出题），按题型过滤后两轮分配——
 * 第一轮每课 1 题保证覆盖面，第二轮补第 2 题填量；最后种子洗牌截断到目标题量。
 * 输入顺序应为 interleaveBySubject 的轮转序，均匀性由它保证。
 */
export function assembleExamItems(
  inputs: LawExamLessonInput[],
  count: number,
  options: { kinds?: LawExamKind[]; seed?: number } = {},
): LawExamItem[] {
  const rand = mulberry32(hashSeed(`exam-${options.seed ?? 0}`));
  const kinds = options.kinds && options.kinds.length > 0 ? new Set(options.kinds) : null;
  // 同一课只进卷一次（调用方去重是常态，这里兜底，防止同题重复占位）
  const seen = new Set<string>();
  const pools = inputs
    .filter((input) => (seen.has(input.lesson.id) ? false : seen.add(input.lesson.id) !== undefined))
    .map((input) => {
      const items = buildQuiz(input.lesson, input.siblingTerms)
        .filter((item) => !kinds || kinds.has(item.kind as LawExamKind))
        .slice(0, MAX_ITEMS_PER_LESSON)
        .map(
          (item): LawExamItem => ({
            ...item,
            subject: input.subject,
            lessonId: input.lesson.id,
            lessonTitle: input.lesson.title,
          }),
        );
      return items;
    });
  const picked: LawExamItem[] = [];
  // 第一轮：每课 1 题（覆盖面优先）
  for (const pool of pools) if (pool.length > 0) picked.push(pool[0]);
  // 第二轮：还不够再从有余量的课补第 2 题
  if (picked.length < count) {
    for (const pool of pools) {
      if (picked.length >= count) break;
      if (pool.length > 1) picked.push(pool[1]);
    }
  }
  return shuffled(picked, rand).slice(0, Math.max(0, count));
}

/** 单题判分：mcq/judge 精确匹配；fill 归一化比对；multi 全对才对；order 逐位一致 */
export function isExamAnswerCorrect(item: LawExamItem, answer: LawExamAnswer | undefined): boolean {
  if (answer === undefined) return false;
  switch (item.kind) {
    case "fill":
      return typeof answer === "string" && fillMatches(answer, item.answer);
    case "multi": {
      if (!Array.isArray(answer)) return false;
      const correct = item.multi ?? item.answer.split("、");
      return answer.length === correct.length && correct.every((option) => answer.includes(option));
    }
    case "order": {
      if (!Array.isArray(answer)) return false;
      const correct = item.order ?? item.answer.split("→");
      return answer.length === correct.length && correct.every((part, index) => answer[index] === part);
    }
    default:
      return typeof answer === "string" && answer === item.answer;
  }
}

/** 作答的展示串（结果页错题列表用）：序列以顿号连接，未作答为 null */
export function examAnswerLabel(answer: LawExamAnswer | undefined): string | null {
  if (answer === undefined) return null;
  return Array.isArray(answer) ? answer.join("、") : answer;
}

/** 整卷判分：逐题判分 + 按科目汇总 + 收集错题（未作答计错） */
export function gradeExam(
  answers: Record<string, LawExamAnswer>,
  items: LawExamItem[],
): LawExamGrade {
  const bySubject: Partial<Record<LawSubjectId, LawExamSubjectScore>> = {};
  const wrong: LawExamWrong[] = [];
  let correct = 0;
  for (const item of items) {
    const answer = answers[item.id];
    const isCorrect = isExamAnswerCorrect(item, answer);
    const score = (bySubject[item.subject] ??= { correct: 0, total: 0 });
    score.total += 1;
    if (isCorrect) {
      correct += 1;
      score.correct += 1;
    } else {
      wrong.push({ item, userAnswer: examAnswerLabel(answer) });
    }
  }
  return { total: items.length, correct, bySubject, wrong };
}

/** 考试总时长（秒） */
export function examDurationSeconds(count: number): number {
  return Math.max(0, count) * EXAM_SECONDS_PER_QUESTION;
}
