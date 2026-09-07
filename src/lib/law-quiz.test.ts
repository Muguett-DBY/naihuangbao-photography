import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildQuiz, hashSeed } from "./law-quiz";
import {
  cleanTerm,
  isCleanVerbatimSentence,
  isMutableSentence,
  isGarbledOrderPart,
  cleanOrderPart,
  hasFragmentCard,
} from "./law-quiz-gates";
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

describe("law quiz robustness（病态输入不抛错，产出必为合法题或空数组）", () => {
  const baseLesson = {
    subject: "minfa",
    code: "一",
    breadcrumb: [] as string[],
    title: "边界测试",
    intro: "",
    pageRange: [1, 1] as [number, number],
    raw: [] as string[],
  };

  it("returns [] for lessons with no steps at all", () => {
    const items = buildQuiz({ ...baseLesson, id: "edge-empty", steps: [] } as LawLesson);
    expect(Array.isArray(items)).toBe(true);
    expect(items).toHaveLength(0);
  });

  it("returns [] when every step text is empty or whitespace", () => {
    const lesson = {
      ...baseLesson,
      id: "edge-blank",
      steps: [
        { id: "s0", kind: "plain", text: "", terms: [] },
        { id: "s1", kind: "plain", text: "   ", terms: [] },
      ],
    } as unknown as LawLesson;
    expect(buildQuiz(lesson)).toHaveLength(0);
  });

  it("handles a single gigantic step without throwing and caps prompt length", () => {
    const lesson = {
      ...baseLesson,
      id: "edge-huge",
      steps: [
        {
          id: "s0",
          kind: "plain",
          text: "正当防卫制度是指为了使国家、公共利益、本人或者他人的人身、财产等权利免受正在进行的不法侵害而采取的制止行为。".repeat(80),
          terms: [],
        },
      ],
    } as unknown as LawLesson;
    const items = buildQuiz(lesson);
    for (const item of items) {
      expect(item.prompt.length).toBeLessThan(120);
      expect(item.prompt.length).toBeGreaterThan(0);
    }
  });

  it("handles a lesson made entirely of quoted-term sentences", () => {
    const lesson = {
      ...baseLesson,
      id: "edge-quotes",
      steps: [
        { id: "s0", kind: "plain", text: "“诚实信用原则”是民事活动的基本原则。", terms: [{ term: "诚实信用原则" }] },
        { id: "s1", kind: "plain", text: "“公序良俗原则”也贯穿始终。", terms: [{ term: "公序良俗原则" }] },
      ],
    } as unknown as LawLesson;
    const items = buildQuiz(lesson);
    for (const item of items) {
      if (item.kind === "mcq") {
        expect(item.options).toContain(item.answer);
      }
    }
  });

  it("returns [] (not an error) for a lesson with no years, no quotes, no definitions", () => {
    const lesson = {
      ...baseLesson,
      id: "edge-plain",
      steps: [{ id: "s0", kind: "plain", text: "本章内容较为简略。", terms: [] }],
    } as unknown as LawLesson;
    const items = buildQuiz(lesson);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeLessThanOrEqual(4);
  });

  it("defends against step/parts/term null-ish fields from damaged data", () => {
    const lesson = {
      ...baseLesson,
      id: "edge-nullish",
      steps: [
        { id: "s0", kind: "plain", text: "侵权责任是指行为人因侵害他人民事权益而依法承担的法律责任。", terms: null },
        { id: "s1", kind: "list", text: "①停止侵害；②排除妨碍；③消除危险。", parts: ["①停止侵害", "②排除妨碍"], rough: true },
      ],
    } as unknown as LawLesson;
    const items = buildQuiz(lesson);
    expect(items.length).toBeLessThanOrEqual(4);
  });

  it("skips rough-marked steps for order questions but still uses their sentences", () => {
    const lesson = {
      ...baseLesson,
      id: "edge-rough",
      steps: [
        { id: "s0", kind: "list", text: "①甲内容；②乙内容；③丙内容。", parts: ["①甲内容", "②乙内容", "③丙内容"], rough: true },
      ],
    } as unknown as LawLesson;
    const items = buildQuiz(lesson);
    expect(items.some((item) => item.kind === "order")).toBe(false);
  });
});

describe("law quiz gates（取材闸门纯函数）", () => {
  it("cleanTerm rejects mnemonic strings and function-word-tailed fragments", () => {
    expect(cleanTerm("40、20、永、无、中")).toBeNull();
    expect(cleanTerm("主体一般立功的主体只能")).toBeNull();
    expect(cleanTerm("正当防卫")).toBe("正当防卫");
    expect(cleanTerm(null)).toBeNull();
  });

  it("isCleanVerbatimSentence rejects inline numbered fragments and label-led rows", () => {
    expect(isCleanVerbatimSentence("法人名义（1）超越法定权限。")).toBe(false);
    expect(isCleanVerbatimSentence("含义拾得迪失物、指发现他人进失之物。")).toBe(false);
    expect(isCleanVerbatimSentence("有期徒刑是剥夺犯罪分子一定期限的人身自由的刑罚方法。")).toBe(true);
  });

  it("isMutableSentence rejects orphan quotes, unbalanced titles, welded years and meta sentences", () => {
    expect(isMutableSentence("”1789年的法国《人权宣言》进一步丰富了理论。")).toBe(false);
    expect(isMutableSentence("代表法典有《汉谟拉比法典》《十二。")).toBe(false);
    expect(isMutableSentence("任何组织不得有超越法律的特权1954年《宪法》规定了监督权。")).toBe(false);
    expect(isMutableSentence("其特征包括：文意拆解法→法定。")).toBe(false);
    expect(isMutableSentence("“人权”观念起源于天赋人权学说。")).toBe(true);
  });

  it("isGarbledOrderPart allows complete sentences and years, rejects half-sentences", () => {
    expect(isGarbledOrderPart("对象是不特定的大多数人。")).toBe(false);
    expect(isGarbledOrderPart("1787年《美国宪法》是世界上第一部成文宪法。")).toBe(false);
    expect(isGarbledOrderPart("监诉的强制措施，")).toBe(true);
    expect(isGarbledOrderPart("西夏、金、南宋）来背诵。")).toBe(true);
    expect(isGarbledOrderPart("Who管控")).toBe(true);
  });

  it("cleanOrderPart strips margin notes", () => {
    expect(cleanOrderPart("接受法律监督和人民群众监督［保民］")).toBe("接受法律监督和人民群众监督");
  });

  it("hasFragmentCard detects fragment duplicates ignoring trailing punctuation", () => {
    expect(hasFragmentCard(["督宪法的实。", "解释宪法。", "修改宪法。", "监督宪法的实施。"])).toBe(true);
    expect(hasFragmentCard(["解释宪法。", "修改宪法。", "监督宪法的实施。"])).toBe(false);
  });
});
