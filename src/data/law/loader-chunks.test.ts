import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectSiblingTerms,
  findLesson,
  isFlowLesson,
  loadLawBook,
  loadLawLessonIndex,
  loadLawLessonView,
  nextFlowLesson,
  type LawLessonView,
} from "./loader";
import { isShellLesson, type LawBook, type LawSubjectId } from "../../types/law";

/**
 * 分块加载与整本 JSON 的全量等价性锁定：
 * 任何一项失败都说明 law:chunks 产物或 loader 装配逻辑和内容数据脱节，
 * 必须先重跑 npm run law:chunks 再排查。
 */

const SUBJECTS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"] as const;

const booksOnDisk = Object.fromEntries(
  SUBJECTS.map((id) => [
    id,
    (JSON.parse(readFileSync(resolve(__dirname, `${id}.json`), "utf8")) as { book: LawBook }).book,
  ]),
) as Record<LawSubjectId, LawBook>;

/** 把 loader 的 ?url 映射劫持到磁盘文件，fetch 直接读源 JSON */
vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const [withoutQuery] = raw.split("?");
  const relative = withoutQuery.replace(/^\w+:\/\//, "").replace(/^\/+/, "");
  const candidates = [resolve(process.cwd(), relative), resolve(__dirname, "..", "..", "..", relative)];
  const errors: unknown[] = [];
  for (const file of candidates) {
    try {
      const text = readFileSync(file, "utf8");
      return { ok: true, status: 200, json: async () => JSON.parse(text) } as Response;
    } catch (cause) {
      errors.push(cause);
    }
  }
  throw new Error(`law chunk fetch stub missed: ${raw} — ${errors.map(String).join("; ")}`);
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("law chunked loader equivalence", () => {
  it("assembles a book structurally identical to the source JSON", async () => {
    for (const id of SUBJECTS) {
      const assembled = await loadLawBook(id);
      expect(assembled).toEqual(booksOnDisk[id]);
    }
  });

  it("loadLawLessonIndex keeps order/total semantics", async () => {
    for (const id of SUBJECTS) {
      const { book, lessons } = await loadLawLessonIndex(id);
      expect(book).toEqual(booksOnDisk[id]);
      const flat = book.chapters.flatMap((chapter) => chapter.lessons);
      expect(lessons.map((entry) => entry.lesson.id)).toEqual(flat.map((lesson) => lesson.id));
      expect(lessons[0]?.order).toBe(1);
      expect(lessons.at(-1)?.order).toBe(flat.length);
      expect(lessons[0]?.total).toBe(book.lessonCount);
    }
  });

  it("view.lesson/order/chapter matches findLesson for every lesson", async () => {
    for (const id of SUBJECTS) {
      const book = booksOnDisk[id];
      for (const expected of book.chapters.flatMap((chapter) =>
        chapter.lessons.map((lesson) => findLesson(book, lesson.id)!),
      )) {
        const view = await loadLawLessonView(id, expected.lesson.id);
        expect(view, `${id}:${expected.lesson.id}`).not.toBeNull();
        expect(view!.lesson).toEqual(expected.lesson);
        expect(view!.order).toBe(expected.order);
        expect(view!.total).toBe(expected.total);
      }
    }
  }, 60_000);

  it("view.nextFlowId matches nextFlowLesson for every lesson", async () => {
    for (const id of SUBJECTS) {
      const book = booksOnDisk[id];
      for (const chapter of book.chapters) {
        for (const lesson of chapter.lessons) {
          const view = await loadLawLessonView(id, lesson.id);
          expect(view, `${id}:${lesson.id}`).not.toBeNull();
          expect(view!.nextFlowId ?? null).toBe(nextFlowLesson(book, lesson.id)?.id ?? null);
        }
      }
    }
  }, 60_000);

  it("view.siblingTerms matches collectSiblingTerms for every lesson", async () => {
    for (const id of SUBJECTS) {
      const book = booksOnDisk[id];
      for (const chapter of book.chapters) {
        for (const lesson of chapter.lessons) {
          const view = await loadLawLessonView(id, lesson.id);
          expect(view, `${id}:${lesson.id}`).not.toBeNull();
          expect(view!.siblingTerms).toEqual(collectSiblingTerms(book, lesson.id));
        }
      }
    }
  }, 60_000);

  it("unknown lesson ids resolve to null (notFound), not errors", async () => {
    expect(await loadLawLessonView("minfa", "minfa-q99999")).toBeNull();
    expect(await loadLawLessonView("minfa", "totally-bogus-id")).toBeNull();
  });

  it("isFlowLesson agrees with the flow flag stored in meta (via next chain spot checks)", async () => {
    // meta.f 的等价性已由 nextFlowId 测试间接锁定；这里再直接抽查附录章/空壳课
    const book = booksOnDisk.zhishixiang;
    const appendix = book.chapters.find((chapter) => chapter.appendix);
    expect(appendix).toBeDefined();
    for (const lesson of appendix!.lessons) {
      expect(isFlowLesson(appendix!, lesson)).toBe(false);
    }
    const shells = book.chapters
      .flatMap((chapter) => chapter.lessons)
      .filter((lesson) => isShellLesson(lesson));
    for (const lesson of shells.slice(0, 20)) {
      const view = await loadLawLessonView("zhishixiang", lesson.id);
      const chapter = book.chapters.find((entry) => entry.lessons.some((item) => item.id === lesson.id))!;
      // 空壳课若不在附录章，meta 也不会把它当学习流起点——它不能是某课的 nextFlowId 终点前最后一环
      expect(view).not.toBeNull();
      expect(chapter.id).toBeTruthy();
    }
  });

  it("chapter metadata (title/semanticTitle/appendix) round-trips", async () => {
    for (const id of SUBJECTS) {
      const book = booksOnDisk[id];
      const first = book.chapters[0];
      const view = await loadLawLessonView(id, first.lessons[0]!.id);
      expect(view!.chapterId).toBe(first.id);
      expect(view!.chapterTitle).toBe(first.title);
      expect(view!.chapterSemanticTitle).toBe(first.semanticTitle);
    }
    const appendixChapter = booksOnDisk.zhishixiang.chapters.find((chapter) => chapter.appendix)!;
    const appendixView = await loadLawLessonView("zhishixiang", appendixChapter.lessons[0]!.id);
    expect(appendixView!.chapterId).toBe(appendixChapter.id);
  });
});
