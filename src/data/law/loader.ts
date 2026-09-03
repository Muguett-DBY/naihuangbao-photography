import type { LawBook, LawLesson, LawSubjectId } from "../../types/law";

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
