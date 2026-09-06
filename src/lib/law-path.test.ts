import { describe, expect, it } from "vitest";
import type { LawBook, LawChapter, LawLesson } from "../types/law";
import type { LawProgressMap } from "./law-progress";
import { buildLessonPath } from "./law-path";

const DAY = 86_400_000;

function lesson(id: string, steps = 2): LawLesson {
  return {
    id,
    subject: "xingfa",
    code: "一",
    breadcrumb: [],
    title: `课 ${id}`,
    intro: "",
    steps: Array.from({ length: steps }, (_, index) => ({
      id: `${id}-s${index}`,
      kind: "plain" as const,
      text: `内容 ${index}`,
      terms: [],
    })),
    pageRange: [1, 1],
    raw: ["内容"],
  };
}

function chapter(id: string, lessons: LawLesson[], extra: Partial<LawChapter> = {}): LawChapter {
  return { id, title: id, level: "chapter", lessons, ...extra };
}

function book(chapters: LawChapter[]): LawBook {
  return {
    id: "xingfa",
    name: "刑法",
    fullName: "刑法背诵一本通",
    emoji: "🛡️",
    accent: "#96608f",
    accentSoft: "#efe6ee",
    chapters,
    lessonCount: chapters.reduce((sum, c) => sum + c.lessons.filter((l) => !l.shell).length, 0),
    leftover: [],
  };
}

describe("buildLessonPath", () => {
  it("numbers nodes sequentially and marks the first unfinished lesson as current", () => {
    const b = book([
      chapter("c1", [lesson("q1"), lesson("q2"), lesson("q3")]),
      chapter("c2", [lesson("q4")]),
    ]);
    const progress: LawProgressMap = {
      q1: { stepsDone: {}, quizBest: 4, quizTotal: 4, wrongCount: 0, lastVisitedAt: 0, completedAt: 100 },
    };
    const path = buildLessonPath(b, progress);
    expect(path.total).toBe(4);
    expect(path.done).toBe(1);
    expect(path.currentIndex).toBe(1);
    expect(path.nodes.map((n) => n.order)).toEqual([1, 2, 3, 4]);
    expect(path.nodes.map((n) => n.state)).toEqual(["done", "current", "todo", "todo"]);
  });

  it("excludes appendix chapters and shell lessons from the path", () => {
    const shell = { ...lesson("s1", 1), raw: [], shell: true };
    const b = book([
      chapter("real", [lesson("q1"), shell, lesson("q2")]),
      chapter("appendix", [lesson("a1"), lesson("a2")], { appendix: true }),
    ]);
    const path = buildLessonPath(b, {});
    expect(path.total).toBe(2);
    expect(path.nodes.map((n) => n.lesson.id)).toEqual(["q1", "q2"]);
  });

  it("moves meta chapters (preface/how-to) to the end of the path", () => {
    const b = book([
      chapter("meta", [lesson("preface")], { title: "作者的话" }),
      chapter("real", [lesson("q1"), lesson("q2")]),
    ]);
    const path = buildLessonPath(b, {});
    expect(path.sections.map((s) => s.title)).toEqual(["real", "作者的话"]);
    // 第一课是正课，不是书前说明
    expect(path.nodes[0].lesson.id).toBe("q1");
    expect(path.nodes[0].state).toBe("current");
    expect(path.sections[1].isMeta).toBe(true);
  });

  it("flags review-due and in-wrong-book nodes relative to now", () => {
    const now = 10 * DAY;
    const b = book([chapter("c", [lesson("q1"), lesson("q2"), lesson("q3")])]);
    const progress: LawProgressMap = {
      // 到期：reviewDueAt 已过
      q1: { stepsDone: {}, quizBest: 0, quizTotal: 4, wrongCount: 2, lastVisitedAt: 0, reviewStage: 1, reviewDueAt: now - DAY },
      // 未毕业但未到期
      q2: { stepsDone: {}, quizBest: 0, quizTotal: 4, wrongCount: 1, lastVisitedAt: 0, reviewStage: 0, reviewDueAt: now + DAY },
      // 已毕业（reviewDueAt 清空）
      q3: { stepsDone: {}, quizBest: 4, quizTotal: 4, wrongCount: 1, lastVisitedAt: 0, reviewStage: 5, completedAt: now },
    };
    const path = buildLessonPath(b, progress, now);
    expect(path.nodes[0].reviewDue).toBe(true);
    expect(path.nodes[0].inWrongBook).toBe(true);
    expect(path.nodes[1].reviewDue).toBe(false);
    expect(path.nodes[1].inWrongBook).toBe(true);
    expect(path.nodes[2].inWrongBook).toBe(false);
  });

  it("handles the all-done book and the empty book", () => {
    const doneBook = book([chapter("c", [lesson("q1"), lesson("q2")])]);
    const progress: LawProgressMap = {
      q1: { stepsDone: {}, quizBest: 4, quizTotal: 4, wrongCount: 0, lastVisitedAt: 0, completedAt: 1 },
      q2: { stepsDone: {}, quizBest: 4, quizTotal: 4, wrongCount: 0, lastVisitedAt: 0, completedAt: 2 },
    };
    const done = buildLessonPath(doneBook, progress);
    expect(done.allDone).toBe(true);
    expect(done.currentIndex).toBe(-1);
    expect(done.done).toBe(2);

    const empty = buildLessonPath(book([chapter("c", [{ ...lesson("s", 1), raw: [], shell: true }])]), {});
    expect(empty.total).toBe(0);
    expect(empty.allDone).toBe(false);
    expect(empty.currentIndex).toBe(-1);
  });
});
