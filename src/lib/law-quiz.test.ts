import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildQuiz, hashSeed } from "./law-quiz";
import { isShellLesson, type LawBook, type LawLesson } from "../types/law";
import { collectSiblingTerms } from "../data/law/loader";

const SUBJECTS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"] as const;

const books = Object.fromEntries(
  SUBJECTS.map((id) => [
    id,
    (JSON.parse(
      readFileSync(resolve(__dirname, "../data/law", `${id}.json`), "utf8"),
    ) as { book: LawBook }).book,
  ]),
) as Record<(typeof SUBJECTS)[number], LawBook>;

const allLessons: LawLesson[] = Object.values(books).flatMap((book) =>
  book.chapters.flatMap((chapter) => chapter.lessons),
);

const realLessons = allLessons.filter((lesson) => !isShellLesson(lesson));

describe("law quiz generation", () => {
  it("is deterministic for the same lesson and context", () => {
    for (const lesson of realLessons.slice(0, 200)) {
      const first = buildQuiz(lesson);
      const second = buildQuiz(lesson);
      expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    }
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
  });

  it("covers the vast majority of real lessons in production (with sibling context)", () => {
    let covered = 0;
    for (const lesson of realLessons) {
      const book = books[lesson.subject];
      const context = collectSiblingTerms(book, lesson.id);
      if (buildQuiz(lesson, context).length > 0) covered += 1;
    }
    expect(covered / realLessons.length).toBeGreaterThan(0.85);
  });

  it("still quizzes ~half of real lessons even without sibling context", () => {
    let covered = 0;
    for (const lesson of realLessons) {
      if (buildQuiz(lesson).length > 0) covered += 1;
    }
    expect(covered / realLessons.length).toBeGreaterThan(0.45);
  });

  it("produces structurally valid questions for every real lesson", () => {
    for (const lesson of realLessons) {
      const book = books[lesson.subject];
      const context = collectSiblingTerms(book, lesson.id);
      const items = buildQuiz(lesson, context);
      expect(items.length).toBeLessThanOrEqual(4);
      const prompts = new Set<string>();
      const lessonText = lesson.steps.map((s) => s.text).join("") + lesson.raw.join("");
      for (const item of items) {
        expect(prompts.has(item.prompt), `${lesson.id}: duplicate prompt`).toBe(false);
        prompts.add(item.prompt);
        if (item.kind === "mcq") {
          const options = item.options ?? [];
          expect(new Set(options).size, `${lesson.id}: duplicate options`).toBe(options.length);
          expect(options).toContain(item.answer);
          expect(item.prompt.includes(item.answer), `${lesson.id}: answer visible in prompt`).toBe(false);
          for (const option of options) {
            if (option !== item.answer) {
              expect(item.prompt.includes(option), `${lesson.id}: ambiguous distractor in prompt`).toBe(false);
            }
          }
          expect(
            lessonText.includes(item.answer),
            `${lesson.id}: answer「${item.answer}」not from this lesson`,
          ).toBe(true);
        }
        if (item.kind === "order") {
          const order = item.order ?? [];
          expect(order.length).toBeGreaterThanOrEqual(3);
          expect(new Set(order).size).toBe(order.length);
        }
        if (item.kind === "judge") {
          expect(["是", "否"]).toContain(item.answer);
        }
      }
    }
  });

  it("mixes both judge styles (mutated=否 and verbatim=是) across the corpus", () => {
    let yes = 0;
    let no = 0;
    for (const lesson of realLessons) {
      for (const item of buildQuiz(lesson)) {
        if (item.kind !== "judge") continue;
        if (item.answer === "是") yes += 1;
        else no += 1;
      }
    }
    expect(yes).toBeGreaterThan(100);
    expect(no).toBeGreaterThan(10);
  });

  it("never quizzes shell lessons with content", () => {
    const shells = allLessons.filter((lesson) => isShellLesson(lesson));
    expect(shells.length).toBeGreaterThan(0);
    for (const shell of shells) {
      // 空壳课没有正文，唯一可出的题只有概念识别（也要求正文概念），必须为 0
      expect(buildQuiz(shell).length).toBe(0);
    }
  });
});
