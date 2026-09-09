import type { LawLesson, LawSubjectId } from "../types/law";
import { isCleanTerm } from "../types/law";
import type { LawLessonProgress, LawProgressMap } from "./law-progress";

/**
 * P2 闪卡数据引擎（纯函数）：从已完成课时抽取「术语 → 上下文」闪卡。
 * - 进度（LawProgressMap）是唯一事实源：只有 completedAt 的课才出卡；
 * - 排序按复习优先级：到期错题课 → 未到期错题课 → 从未复习的完成课 → 其余完成课，
 *   同组内先到期的/先完成的排前面，术语在整副牌内去重（优先级高的课先认领）；
 * - 每课 2-5 张：课时标题卡 1 张 + 术语卡最多 4 张；无干净术语的课从步骤要点/口诀兜底。
 */

/** 卡背上下文摘要的最大长度（字） */
export const FLASHCARD_BACK_MAX = 80;
/** 每课术语卡上限（+1 张标题卡 = 每课最多 5 张、至少 2 张） */
export const FLASHCARD_TERMS_PER_LESSON = 4;

/** 复习优先级：0=到期错题课 1=未到期错题课 2=从未复习的完成课 3=其余完成课 */
export type FlashcardRank = 0 | 1 | 2 | 3;

export interface Flashcard {
  /** 稳定唯一键：{lessonId}#{序号} */
  id: string;
  lessonId: string;
  subject: LawSubjectId;
  lessonTitle: string;
  /** 正面：课时标题 / 步骤术语名（口诀兜底为「标题·口诀」） */
  front: string;
  /** 背面：术语所在步骤 / 课时简介的课本原文摘要（≤80 字） */
  back: string;
  kind: "lesson" | "term" | "mnemonic";
  rank: FlashcardRank;
}

/** 闪卡筛选口径：全部已完成 / 仅错题课（未毕业）/ 仅未复习（从未自测） */
export type FlashcardScope = "all" | "wrong" | "fresh";

/** getDueFlashcards 的返回项：该轮最该刷的课，按优先级排好 */
export interface FlashcardDueRef {
  lessonId: string;
  subject: LawSubjectId;
  /** due=到期错题课 fresh=从未复习的已完成课 */
  reason: "due" | "fresh";
  dueAt?: number;
}

const SUBJECT_RE = /^([a-z]+)-q/;

/** 从课时 id 推断学科（如 minfa-q031 → minfa）；非课时 id 返回 null */
export function subjectOfLessonId(lessonId: string): LawSubjectId | null {
  const match = SUBJECT_RE.exec(lessonId);
  return (match?.[1] as LawSubjectId | undefined) ?? null;
}

/** 是否未毕业的错题课（错题本口径：答错过且仍在复习循环里） */
export function isActiveWrongLesson(entry: LawLessonProgress | undefined): boolean {
  return (entry?.wrongCount ?? 0) > 0 && entry?.reviewDueAt !== undefined;
}

/** 是否从未复习的完成课：跳过自测或未经自测就完成了（quizTotal 恒为 0） */
export function isFreshLesson(entry: LawLessonProgress | undefined): boolean {
  return entry?.completedAt !== undefined && (entry.quizTotal ?? 0) === 0;
}

function lessonRank(entry: LawLessonProgress | undefined, now: number): FlashcardRank {
  if (entry?.reviewDueAt !== undefined) return entry.reviewDueAt <= now ? 0 : 1;
  if (isFreshLesson(entry)) return 2;
  return 3;
}

/** 课本原文摘要：≤max 字，超长时优先在句读处截断 */
export function summarizeContext(text: string, max: number = FLASHCARD_BACK_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max - 2);
  const window = slice.slice(Math.max(0, slice.length - 24));
  let cutAt = -1;
  for (const ch of ["。", "；", "！", "？", "，", "、"]) {
    const at = window.lastIndexOf(ch);
    if (at > cutAt) cutAt = at;
  }
  const body = cutAt >= 0 ? slice.slice(0, slice.length - 24 + cutAt + 1) : slice;
  return `${body.trimEnd()}……`;
}

function firstMeaningfulText(lesson: LawLesson): string {
  const intro = lesson.intro?.trim();
  if (intro) return intro;
  for (const step of lesson.steps) {
    if (step.text.trim()) return step.text;
  }
  return lesson.raw.find((line) => line.trim()) ?? lesson.title;
}

function stripTermBrackets(term: string): string {
  return term.trim().replace(/^[（(【[]|[）)】\]]$/g, "").trim();
}

/**
 * 定义主语挖掘：背诵本正文大量为「X，是指Y」/「X又称Y，是指Z」句式，
 * 从中挖出 X 作为术语卡正面（terms 缺失时的主要出卡来源）。
 */
export function mineDefinitionHead(text: string): string | null {
  const head = text.replace(/\s+/g, "").slice(0, 48);
  const marker = /是指|，指|，即/.exec(head);
  if (!marker) return null;
  const subject = head
    .slice(0, marker.index)
    .split("又称")[0]
    .replace(/^[一二三四五六七八九十0-9０-９、.．()（）]+/, "")
    .replace(/[，,、：:；;]$/, "")
    .replace(/^所谓/, "")
    .trim();
  const cleaned = stripTermBrackets(subject);
  return isCleanTerm(cleaned) ? cleaned : null;
}

/** 单课出卡：标题卡 + 术语卡（整副牌去重），不足 2 张时用步骤要点/口诀兜底 */
function cardsForLesson(
  lesson: LawLesson,
  rank: FlashcardRank,
  seenTerms: Set<string>,
): Flashcard[] {
  const base = { lessonId: lesson.id, subject: lesson.subject, lessonTitle: lesson.title, rank };
  const cards: Flashcard[] = [
    {
      ...base,
      id: `${lesson.id}#0`,
      front: lesson.title,
      back: summarizeContext(firstMeaningfulText(lesson)),
      kind: "lesson",
    },
  ];
  for (const step of lesson.steps) {
    if (cards.length > FLASHCARD_TERMS_PER_LESSON) break;
    for (const term of step.terms ?? []) {
      if (cards.length > FLASHCARD_TERMS_PER_LESSON) break;
      const name = stripTermBrackets(term.term ?? "");
      // 与课时标题同名的术语已被标题卡覆盖，跳过（避免同面双卡）
      if (!isCleanTerm(name) || name === lesson.title.trim() || seenTerms.has(name)) continue;
      seenTerms.add(name);
      cards.push({
        ...base,
        id: `${lesson.id}#${cards.length}`,
        front: name,
        back: summarizeContext(step.text),
        kind: "term",
      });
    }
  }
  // 补充来源：定义句式主语（"X，是指Y"），出卡主力——背诵本正文大量为此句式
  for (const step of lesson.steps) {
    if (cards.length > FLASHCARD_TERMS_PER_LESSON) break;
    for (const text of [step.text, ...(step.parts ?? [])]) {
      if (cards.length > FLASHCARD_TERMS_PER_LESSON) break;
      if (!text) continue;
      const name = mineDefinitionHead(text);
      if (!name || seenTerms.has(name)) continue;
      seenTerms.add(name);
      cards.push({
        ...base,
        id: `${lesson.id}#${cards.length}`,
        front: name,
        back: summarizeContext(text),
        kind: "term",
      });
    }
  }
  // 兜底 1：无干净术语的课从列表/要件等步骤要点补卡（保证"每课至少 2 张"）
  for (const step of lesson.steps) {
    if (cards.length >= 2) break;
    for (const part of step.parts ?? []) {
      if (cards.length >= 2) break;
      const name = part.trim();
      if (name.length < 2 || name.length > 24 || seenTerms.has(name)) continue;
      seenTerms.add(name);
      cards.push({
        ...base,
        id: `${lesson.id}#${cards.length}`,
        front: name,
        back: summarizeContext(step.text),
        kind: "term",
      });
    }
  }
  // 兜底 2：口诀卡
  const mnemonic = lesson.mnemonic?.trim();
  if (cards.length < 2 && mnemonic) {
    cards.push({
      ...base,
      id: `${lesson.id}#${cards.length}`,
      front: `${lesson.title} · 口诀`,
      back: summarizeContext(mnemonic),
      kind: "mnemonic",
    });
  }
  return cards;
}

function compareLessons(
  a: { entry: LawLessonProgress | undefined; id: string; rank: FlashcardRank },
  b: { entry: LawLessonProgress | undefined; id: string; rank: FlashcardRank },
): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  const dueGap = (a.entry?.reviewDueAt ?? Number.POSITIVE_INFINITY) - (b.entry?.reviewDueAt ?? Number.POSITIVE_INFINITY);
  if (dueGap !== 0) return dueGap;
  const doneGap = (a.entry?.completedAt ?? 0) - (b.entry?.completedAt ?? 0);
  if (doneGap !== 0) return doneGap;
  return a.id.localeCompare(b.id);
}

/**
 * 构建闪卡牌堆（纯函数）：
 * - 只出 completedAt 的课；subjectFilter 缺省/"all" 不过滤；scope 过滤口径见 FlashcardScope；
 * - 牌序按复习优先级（到期错题课的卡片排前面），术语整副牌去重、每课 2-5 张。
 */
export function buildFlashcards(
  progress: LawProgressMap,
  lessons: readonly LawLesson[],
  subjectFilter?: LawSubjectId | "all",
  scope: FlashcardScope = "all",
  now: number = Date.now(),
): Flashcard[] {
  const ranked = lessons
    .filter((lesson) => progress[lesson.id]?.completedAt !== undefined)
    .filter((lesson) => !subjectFilter || subjectFilter === "all" || lesson.subject === subjectFilter)
    .filter((lesson) => {
      const entry = progress[lesson.id];
      if (scope === "wrong") return isActiveWrongLesson(entry);
      if (scope === "fresh") return isFreshLesson(entry);
      return true;
    })
    .map((lesson) => ({ lesson, id: lesson.id, entry: progress[lesson.id], rank: lessonRank(progress[lesson.id], now) }))
    .sort((a, b) => compareLessons(a, b));
  const seenTerms = new Set<string>();
  return ranked.flatMap(({ lesson, rank }) => cardsForLesson(lesson, rank, seenTerms));
}

/** 本轮最该刷的课：到期错题课（按到期时间升序）+ 从未复习的完成课（按完成时间升序） */
export function getDueFlashcards(progress: LawProgressMap, now: number = Date.now()): FlashcardDueRef[] {
  const refs: FlashcardDueRef[] = [];
  for (const [lessonId, entry] of Object.entries(progress)) {
    if (entry.completedAt === undefined) continue;
    const subject = subjectOfLessonId(lessonId);
    if (!subject) continue;
    if (entry.reviewDueAt !== undefined && entry.reviewDueAt <= now) {
      refs.push({ lessonId, subject, reason: "due", dueAt: entry.reviewDueAt });
    } else if (isFreshLesson(entry)) {
      refs.push({ lessonId, subject, reason: "fresh" });
    }
  }
  return refs.sort((a, b) => {
    if (a.reason !== b.reason) return a.reason === "due" ? -1 : 1;
    const gap =
      (a.reason === "due" ? (a.dueAt ?? 0) : (progress[a.lessonId]?.completedAt ?? 0)) -
      (b.reason === "due" ? (b.dueAt ?? 0) : (progress[b.lessonId]?.completedAt ?? 0));
    return gap !== 0 ? gap : a.lessonId.localeCompare(b.lessonId);
  });
}

/** 课时按复习优先级排序（入口页选课后、加载正文前用，配合轮次上限截断） */
export function orderLessonsByPriority(
  progress: LawProgressMap,
  lessonIds: readonly string[],
  now: number = Date.now(),
): string[] {
  return lessonIds
    .map((id) => ({ id, entry: progress[id], rank: lessonRank(progress[id], now) }))
    .sort((a, b) => compareLessons(a, b))
    .map(({ id }) => id);
}
