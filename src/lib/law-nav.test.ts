import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isFlowLesson, nextFlowLesson } from "../data/law/loader";
import { isShellLesson, type LawBook, type LawChapter, type LawLesson } from "../types/law";

const books = Object.fromEntries(
  ["minfa", "zhishixiang"].map((id) => [
    id,
    (JSON.parse(
      readFileSync(resolve(__dirname, "../data/law", `${id}.json`), "utf8"),
    ) as { book: LawBook }).book,
  ]),
) as Record<"minfa" | "zhishixiang", LawBook>;

describe("law learning-flow navigation", () => {
  it("never dead-ends before the last flow lesson of a book", () => {
    // 回归：此前用"全书序号 < lessonCount"判定有没有下一课，序号含空壳/附录课而
    // lessonCount 不含，minfa 书尾 62 课、zhishixiang 书尾 1 课的「下一课」被错误吞掉
    for (const book of Object.values(books)) {
      const flat = book.chapters.flatMap((chapter) =>
        chapter.lessons.map((lesson) => ({ chapter, lesson })),
      );
      const flowEntries = flat.filter(({ chapter, lesson }) => isFlowLesson(chapter, lesson));
      for (let i = 0; i < flowEntries.length - 1; i += 1) {
        const next = nextFlowLesson(book, flowEntries[i].lesson.id);
        expect(
          next,
          `${book.id}: ${flowEntries[i].lesson.id} 应有下一课（其后还有 ${
            flowEntries.length - i - 1
          } 个学习流课时）`,
        ).not.toBeNull();
      }
    }
  });

  it("returns null only after the final flow lesson", () => {
    for (const book of Object.values(books)) {
      const flat = book.chapters.flatMap((chapter) =>
        chapter.lessons.map((lesson) => ({ chapter, lesson })),
      );
      const flowEntries = flat.filter(({ chapter, lesson }) => isFlowLesson(chapter, lesson));
      const last = flowEntries[flowEntries.length - 1];
      expect(nextFlowLesson(book, last.lesson.id)).toBeNull();
    }
  });

  it("never navigates into a shell or appendix lesson", () => {
    // 回归：minfa 曾有 76 个课时的「下一课」直接落进空壳索引课（无正文的死页）
    for (const book of Object.values(books)) {
      const flat = book.chapters.flatMap((chapter) =>
        chapter.lessons.map((lesson) => ({ chapter, lesson })),
      );
      for (const { chapter, lesson } of flat) {
        const next = nextFlowLesson(book, lesson.id);
        if (!next) continue;
        expect(isShellLesson(next), `${book.id}: 下一课 ${next.id} 是空壳课`).toBe(false);
        const nextChapter = book.chapters.find((c) =>
          c.lessons.some((l) => l.id === next.id),
        );
        expect(nextChapter?.appendix, `${book.id}: 下一课 ${next.id} 落进附录章`).not.toBe(true);
      }
    }
  });

  it("treats appendix chapters and shells as outside the learning flow", () => {
    const mkChapter = (over: Partial<LawChapter>): LawChapter => ({
      id: "c",
      title: "章",
      level: "chapter",
      lessons: [],
      ...over,
    });
    const mkLesson = (over: Partial<LawLesson>): LawLesson => ({
      id: "l",
      subject: "minfa",
      code: "一",
      breadcrumb: [],
      title: "课",
      intro: "",
      steps: [{ id: "l-s0", kind: "plain", text: "正文内容。", terms: [] }],
      pageRange: [1, 1],
      raw: ["正文内容。"],
      ...over,
    });
    const shell = mkLesson({ id: "shell-1", steps: [], raw: [] });
    shell.shell = true;
    const book: LawBook = {
      id: "minfa",
      name: "民法",
      fullName: "民法",
      emoji: "🏠",
      accent: "#000",
      accentSoft: "#fff",
      lessonCount: 2,
      chapters: [
        mkChapter({
          id: "c1",
          lessons: [mkLesson({ id: "a" }), shell, mkLesson({ id: "b" })],
        }),
        mkChapter({ id: "c2", appendix: true, lessons: [mkLesson({ id: "ap" })] }),
        mkChapter({ id: "c3", lessons: [mkLesson({ id: "c" })] }),
      ],
      leftover: [],
    };

    expect(nextFlowLesson(book, "a")?.id).toBe("b");
    expect(nextFlowLesson(book, "b")?.id).toBe("c");
    expect(nextFlowLesson(book, "c")).toBeNull();
    expect(nextFlowLesson(book, "ap")?.id).toBe("c");
    expect(nextFlowLesson(book, "missing")).toBeNull();
  });
});
