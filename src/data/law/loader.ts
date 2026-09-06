import type { LawBook, LawLesson, LawSubjectId } from "../../types/law";
import { isCleanTerm, isShellLesson } from "../../types/law";

/** 每科内容为独立 JSON 构建产物（由 node scripts/build-law-content.mjs 生成），按需加载。 */
const LOADERS: Record<LawSubjectId, () => Promise<{ book: LawBook }>> = {
  falixue: () => import("./falixue.json") as Promise<{ book: LawBook }>,
  xianfa: () => import("./xianfa.json") as Promise<{ book: LawBook }>,
  zhishixiang: () => import("./zhishixiang.json") as Promise<{ book: LawBook }>,
  minfa: () => import("./minfa.json") as Promise<{ book: LawBook }>,
  xingfa: () => import("./xingfa.json") as Promise<{ book: LawBook }>,
};

export async function loadLawBook(subject: LawSubjectId): Promise<LawBook> {
  const module = await LOADERS[subject]();
  return module.book;
}

export interface LawLessonRef {
  subject: LawSubjectId;
  lesson: LawLesson;
  /** 该书第几个知识点（1-based） */
  order: number;
  total: number;
}

/** 汇总所有课时引用，供首页/下一篇导航使用。 */
export async function loadLawLessonIndex(subject: LawSubjectId): Promise<{
  book: LawBook;
  lessons: LawLessonRef[];
}> {
  const book = await loadLawBook(subject);
  const lessons: LawLessonRef[] = [];
  book.chapters.forEach((chapter) => {
    chapter.lessons.forEach((lesson) => {
      lessons.push({ subject, lesson, order: lessons.length + 1, total: book.lessonCount });
    });
  });
  return { book, lessons };
}

export function findLesson(
  book: LawBook,
  lessonId: string,
): { lesson: LawLesson; order: number; total: number } | null {
  let order = 0;
  for (const chapter of book.chapters) {
    for (const lesson of chapter.lessons) {
      order += 1;
      if (lesson.id === lessonId) {
        return { lesson, order, total: book.lessonCount };
      }
    }
  }
  return null;
}

/** 学习流课时：索引空壳课与附录章（考点索引）不进学习流 */
export function isFlowLesson(chapter: { appendix?: boolean }, lesson: LawLesson): boolean {
  return !chapter.appendix && !isShellLesson(lesson);
}

/**
 * 学习流的下一课：跳过索引空壳课与附录章课时。
 * 直接取"下一个存在的学习流课时"判定有没有下一课——
 * 绝不能用"全书序号 < lessonCount"判断：序号含空壳/附录课，lessonCount 不含，
 * 两边口径不一致会把书尾几十课的「下一课」错误吞掉。
 */
export function nextFlowLesson(book: LawBook, lessonId: string): LawLesson | null {
  const flat = book.chapters.flatMap((chapter) =>
    chapter.lessons.map((lesson) => ({ chapter, lesson })),
  );
  const index = flat.findIndex((entry) => entry.lesson.id === lessonId);
  if (index < 0) return null;
  for (let i = index + 1; i < flat.length; i += 1) {
    if (isFlowLesson(flat[i].chapter, flat[i].lesson)) return flat[i].lesson;
  }
  return null;
}

/** 收集同章其它课的概念词，供选择题干扰项使用（答案永远出自本课） */
export function collectSiblingTerms(book: LawBook, lessonId: string): string[] {
  const terms: string[] = [];
  for (const chapter of book.chapters) {
    const current = chapter.lessons.find((lesson) => lesson.id === lessonId);
    if (!current) continue;
    for (const lesson of chapter.lessons) {
      if (lesson.id === lessonId) continue;
      for (const step of lesson.steps) {
        for (const term of step.terms ?? []) {
          const cleaned = term.term?.trim().replace(/^[（(【[]|[）)】\]]$/g, "").trim();
          if (cleaned && isCleanTerm(cleaned) && !terms.includes(cleaned)) {
            terms.push(cleaned);
          }
        }
        if (terms.length >= 40) break;
      }
      if (terms.length >= 40) break;
    }
    break;
  }
  return terms.slice(0, 40);
}
