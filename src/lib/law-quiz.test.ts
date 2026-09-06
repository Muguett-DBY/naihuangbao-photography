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

function isMetaTitle(title: string): boolean {
  return /^(作者的话|使用说明|序言|前言|后记)$/.test(title.trim());
}

describe("law quiz generation", () => {
  it("is deterministic for the same lesson and context", () => {
    for (const lesson of realLessons.slice(0, 200)) {
      const first = buildQuiz(lesson);
      const second = buildQuiz(lesson);
      expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    }
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
  });

  it("covers the vast majority of teaching lessons in production (with sibling context)", () => {
    let covered = 0;
    let teaching = 0;
    for (const lesson of realLessons) {
      // 覆盖率只对"教学课"负责：导览课（章节前导碎片）与元信息课走"标记掌握"路径，不出题
      if (lesson.id.endsWith("-tour") || isMetaTitle(lesson.title)) continue;
      teaching += 1;
      const book = books[lesson.subject];
      const context = collectSiblingTerms(book, lesson.id);
      if (buildQuiz(lesson, context).length > 0) covered += 1;
    }
    // 0.80：质量优先——读不通的 OCR 残句不再硬出题，无合格题面的课走"标记掌握"兜底
    expect(covered / teaching).toBeGreaterThan(0.8);
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

  it("rejects OCR-garbled sentences as verbatim judge questions", () => {
    // 回归：minfa-q482 曾把"……强制缔约目的义务算二〇典合国。"这种糊句
    // 当"书上是这样说的吗？（是）"出题——〇 后接普通汉字是扫描残渣，无法作答；
    // 而"二〇二五"这类年份里的〇是合法写法，不得误伤
    const garbled = {
      id: "fixture-garbled",
      subject: "minfa",
      code: "一",
      breadcrumb: [],
      title: "供用电合同",
      intro: "",
      steps: [
        {
          id: "fixture-garbled-s0",
          kind: "plain",
          text: "合同目的是为了满足社会公众的生活需要，故供应人有强制缔约目的义务算二〇典合国。",
          terms: [],
        },
        {
          id: "fixture-garbled-s1",
          kind: "plain",
          text: "电、水、气、热力的供应人通常是专营的，具有特定性。",
          terms: [],
        },
      ],
      pageRange: [1, 1],
      raw: [],
    } as LawLesson;
    const items = buildQuiz(garbled);
    for (const item of items) {
      if (item.kind !== "judge") continue;
      expect(
        item.prompt.includes("算二〇典合国"),
        "糊句不得作为判断题题面",
      ).toBe(false);
    }

    const yearLesson = {
      ...garbled,
      id: "fixture-year",
      steps: [
        {
          id: "fixture-year-s0",
          kind: "plain",
          text: "该法于二〇二五年正式施行，标志着制度进一步完善。",
          terms: [],
        },
      ],
    } as LawLesson;
    const yearItems = buildQuiz(yearLesson);
    const judge = yearItems.find((item) => item.kind === "judge");
    // 年份句可以出题；若出了"改年份"判断题，题面必须仍是可读的合法句子
    if (judge) {
      expect(judge.prompt).toContain("二");
      expect(judge.prompt).not.toMatch(/[○□◊]/);
    }
  });
});
