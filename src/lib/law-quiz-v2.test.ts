import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildQuiz } from "./law-quiz";
import { buildMultiItem, multiTopicOf } from "./law-quiz-multi";
import { fillMatches, normalizeFillText } from "./law-quiz-fill";
import { looksLikePerson, mutateQuotedTerm } from "./law-quiz-mutate";
import { deriveWrongTag, tallyWrongTags, topWrongTags } from "./law-wrong-tags";
import { isShellLesson, type LawBook, type LawLesson } from "../types/law";
import { collectSiblingTerms } from "../data/law/loader";

const SUBJECTS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"] as const;
const books = Object.fromEntries(
  SUBJECTS.map((id) => [
    id,
    JSON.parse(readFileSync(resolve(__dirname, "../data/law", `${id}.json`), "utf8")) as { book: LawBook },
  ]),
) as Record<(typeof SUBJECTS)[number], { book: LawBook }>;

const allLessons = Object.values(books).flatMap((entry) => entry.book.chapters.flatMap((c) => c.lessons));
const realLessons = allLessons.filter((lesson) => !isShellLesson(lesson));
const isMetaTitle = (title: string) => /^(作者的话|使用说明|序言|前言|后记)$/.test(title.trim());
const teaching = realLessons.filter((lesson) => !lesson.id.endsWith("-tour") && !isMetaTitle(lesson.title));

function randOf(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const baseLesson = {
  subject: "minfa",
  code: "一",
  breadcrumb: [] as string[],
  intro: "",
  pageRange: [1, 1] as number[],
  raw: [] as string[],
};

describe("fill 答案归一化", () => {
  it("忽略空白、引号包裹与全半角差异", () => {
    expect(normalizeFillText("诚实信用原则")).toBe(normalizeFillText("诚实信用 原则"));
    expect(normalizeFillText("「诚实信用原则」")).toBe("诚实信用原则");
    expect(normalizeFillText("“诚实信用原则”")).toBe("诚实信用原则");
    expect(normalizeFillText("诚实信用原则\u3000")).toBe("诚实信用原则");
    expect(normalizeFillText("ＷＴＯ规则")).toBe(normalizeFillText("wto规则"));
  });

  it("fillMatches：空输入判错，实质不同判错", () => {
    expect(fillMatches("公序良俗", "公序良俗")).toBe(true);
    expect(fillMatches("「公序良俗」", "公序良俗")).toBe(true);
    expect(fillMatches("", "公序良俗")).toBe(false);
    expect(fillMatches("   ", "公序良俗")).toBe(false);
    expect(fillMatches("诚实信用", "公序良俗")).toBe(false);
  });
});

describe("fill 题型生成（buildQuiz 集成）", () => {
  const fixture = {
    ...baseLesson,
    id: "fixture-fill2",
    title: "诚实信用原则",
    steps: [
      { id: "s0", kind: "definition", text: "诚实信用原则，是指民事主体从事民事活动应当秉持诚实、恪守承诺的原则。", terms: [{ term: "诚实信用原则" }] },
      { id: "s1", kind: "plain", text: "当事人应当遵循诚信原则，根据合同的性质、目的和交易习惯履行义务。", terms: [] },
    ],
  } as unknown as LawLesson;

  it("fill 题面挖空且答案不可见，判分用归一化比较", () => {
    const items = buildQuiz(fixture);
    const fill = items.filter((item) => item.kind === "fill");
    expect(fill.length).toBeGreaterThan(0);
    for (const item of fill) {
      expect(item.prompt).toContain("＿＿＿");
      expect(item.prompt.includes(item.answer)).toBe(false);
      expect(fillMatches(item.answer, item.answer)).toBe(true);
    }
  });

  it("全库 fill 结构合法：答案出自本课正文、题面收尾干净、每课至多一道", () => {
    let fillTotal = 0;
    for (const lesson of teaching) {
      const context = collectSiblingTerms(books[lesson.subject].book, lesson.id);
      const items = buildQuiz(lesson, context);
      const fills = items.filter((item) => item.kind === "fill");
      expect(fills.length, `${lesson.id}: 每课至多一道 fill`).toBeLessThanOrEqual(1);
      fillTotal += fills.length;
      const lessonText = lesson.steps.map((s) => s.text).join("") + lesson.raw.join("");
      for (const item of fills) {
        expect(item.prompt).toContain("＿＿＿");
        expect(item.prompt.includes(item.answer), `${lesson.id}: fill 答案在题面可见`).toBe(false);
        expect(lessonText.includes(item.answer), `${lesson.id}: fill 答案不在本课正文`).toBe(true);
        expect(item.answer.length).toBeGreaterThanOrEqual(3);
        expect(item.answer.length).toBeLessThanOrEqual(8);
      }
    }
    expect(fillTotal).toBeGreaterThan(80); // 新题型在全库有实际覆盖
  });

  it("fill 生成确定性：同课两次生成完全一致", () => {
    for (const lesson of teaching.slice(0, 120)) {
      expect(JSON.stringify(buildQuiz(lesson))).toBe(JSON.stringify(buildQuiz(lesson)));
    }
  });
});

describe("multi 多选题生成", () => {
  const listLesson = {
    ...baseLesson,
    id: "fixture-multi",
    title: "法官的义务",
    steps: [
      {
        id: "s0",
        kind: "list",
        text: "1.清正廉明，忠于职守；2.保守审判工作秘密；3.接受法律监督；4.维护社会公共利益。",
        parts: ["1.清正廉明，忠于职守", "2.保守审判工作秘密", "3.接受法律监督", "4.维护社会公共利益"],
        terms: [],
      },
    ],
  } as unknown as LawLesson;

  it("条目 ≥4 时生成：正确项=条目，干扰项来自同章且不在本课正文", () => {
    const item = buildMultiItem(
      listLesson,
      ["回避制度", "证据保全", "管辖异议", "非法概念词"],
      listLesson.steps[0].text,
      randOf(7),
    );
    expect(item).not.toBeNull();
    expect(item!.multi).toHaveLength(4);
    expect(item!.options!.length).toBeGreaterThanOrEqual(6);
    for (const correct of item!.multi!) {
      expect(item!.options).toContain(correct);
    }
    // 全对才对：answer 是正确项的顿号连接
    expect(item!.answer).toBe(item!.multi!.join("、"));
  });

  it("条目 <4 不出题（正确项 <3 铁则的前置闸门）", () => {
    const short = {
      ...listLesson,
      steps: [
        {
          id: "s0",
          kind: "list",
          text: "1.甲项；2.乙项；3.丙项。",
          parts: ["1.甲项内容", "2.乙项内容", "3.丙项内容"],
          terms: [],
        },
      ],
    } as unknown as LawLesson;
    expect(buildMultiItem(short, ["干扰项甲乙丙丁"], short.steps[0].text, randOf(3))).toBeNull();
  });

  it("行内［注记］表格交错步整步不用；尾部焊接标签按 raw 独立行剥离", () => {
    const tabled = {
      ...listLesson,
      raw: ["客体", "权限", "内容"],
      steps: [
        {
          id: "s0",
          kind: "list",
          text: "1.甲规则是有国家意志性的规则，这区别于其他规范客体；2.乙规则是一般性规则权限。",
          parts: [
            "1.甲规则是有国家意志性的规则，这区别于其他规范客体",
            "2.乙规则是一般性规则权限",
            "3.丙规则是命令式规则内容",
            "4.丁规则规定权利义务和制裁",
          ],
          terms: [],
        },
        {
          id: "s1",
          kind: "list",
          text: "1.带［反］注记的条目；2.另一条；3.第三条；4.第四条。",
          parts: ["1.带［反］注记的条目", "2.另一条内容", "3.第三条内容", "4.第四条内容"],
          terms: [],
        },
      ],
    } as unknown as LawLesson;
    const item = buildMultiItem(tabled, ["回避制度", "证据保全", "公开审判"], tabled.steps[0].text + tabled.steps[1].text, randOf(11));
    expect(item).not.toBeNull();
    // 第一个步的焊接标签（客体/权限/内容）被剥掉；［注记］步被跳过
    expect(item!.multi!.some((part) => /客体$|权限$|内容$/.test(part))).toBe(false);
    expect(item!.multi!.some((part) => part.includes("［"))).toBe(false);
  });

  it("悬垂动词保护：剥掉标签后剩“予以”则回退原文", () => {
    const lesson = {
      ...listLesson,
      raw: ["保密"],
      steps: [
        {
          id: "s0",
          kind: "list",
          text: "1.保守秘密对在履行职责中知悉的个人隐私予以保密。",
          parts: [
            "1.保守审判工作秘密，对在履行职责中知悉的个人隐私予以保密",
            "2.接受法律监督和人民群众监督",
            "3.维护国家利益和社会公共利益",
            "4.清正廉明，忠于职守，遵守纪律",
          ],
          terms: [],
        },
      ],
    } as unknown as LawLesson;
    const item = buildMultiItem(lesson, ["回避制度", "证据保全"], lesson.steps[0].text, randOf(5));
    expect(item).not.toBeNull();
    expect(item!.multi!.some((part) => part.endsWith("予以保密"))).toBe(true);
  });

  it("multiTopicOf 剥考试注记与设问指令词", () => {
    expect(multiTopicOf("立法活动的特点 (2016 年非法学简答)")).toBe("立法活动的特点");
    expect(multiTopicOf("简述法对效率价值的意义")).toBe("法对效率价值的意义");
    expect(multiTopicOf("序言")).toBeNull();
    expect(multiTopicOf("法")).toBeNull();
  });

  it("全库 multi 结构合法：正确项 3-5、选项互斥、干扰项不在本课正文/主题", () => {
    let multiTotal = 0;
    for (const lesson of teaching) {
      const context = collectSiblingTerms(books[lesson.subject].book, lesson.id);
      const items = buildQuiz(lesson, context);
      const multis = items.filter((item) => item.kind === "multi");
      expect(multis.length, `${lesson.id}: 每课至多一道 multi`).toBeLessThanOrEqual(1);
      multiTotal += multis.length;
      const lessonText = lesson.steps.map((s) => s.text).join("") + lesson.raw.join("");
      const topic = multiTopicOf(lesson.title) ?? lesson.title;
      for (const item of multis) {
        const correct = item.multi ?? [];
        expect(correct.length, `${lesson.id}: 正确项<3`).toBeGreaterThanOrEqual(3);
        expect(correct.length).toBeLessThanOrEqual(5);
        expect(new Set(item.options).size).toBe(item.options!.length);
        const correctSet = new Set(correct);
        for (const option of item.options!) {
          if (correctSet.has(option)) continue;
          expect(lessonText.includes(option), `${lesson.id}: 干扰项「${option}」在本课正文`).toBe(false);
          expect(topic.includes(option), `${lesson.id}: 干扰项「${option}」在主题可见`).toBe(false);
        }
      }
    }
    expect(multiTotal).toBeGreaterThan(80);
  });
});

describe("judge trap 与错因标签", () => {
  it("年份变异题带 number 陷阱，术语变异带 term/person/book", () => {
    const yearLesson = {
      ...baseLesson,
      id: "fixture-judge-year",
      title: "宪法施行",
      steps: [
        { id: "s0", kind: "plain", text: "新中国成立以后，1954年《宪法》确立了基本制度体系。", terms: [] },
      ],
    } as unknown as LawLesson;
    const judge = buildQuiz(yearLesson).find((item) => item.kind === "judge");
    expect(judge).toBeDefined();
    expect(judge!.trap).toBe("number");

    const personMutation = mutateQuotedTerm("“董仲舒”提出了春秋决狱的主张。", ["沈家本", "法律解释", "宋刑统"], randOf(99));
    expect(personMutation).not.toBeNull();
    expect(personMutation!.trap).toBe("person");
    const bookMutation = mutateQuotedTerm("《法经》是中国历史上第一部比较系统的成文法典。", ["唐律疏议", "九章律"], randOf(8));
    if (bookMutation) expect(bookMutation.trap).toBe("book");
  });

  it("looksLikePerson：人名/帝王称号判定", () => {
    expect(looksLikePerson("商鞅")).toBe(true);
    expect(looksLikePerson("隋文帝")).toBe(true);
    expect(looksLikePerson("正当防卫")).toBe(false);
    expect(looksLikePerson("法律规则")).toBe(false);
  });

  it("deriveWrongTag 按题型与陷阱映射四类+顺序", () => {
    expect(deriveWrongTag({ kind: "judge", trap: "number" })).toBe("数字记错");
    expect(deriveWrongTag({ kind: "judge", trap: "cn-number" })).toBe("数字记错");
    expect(deriveWrongTag({ kind: "judge", trap: "person" })).toBe("人物错配");
    expect(deriveWrongTag({ kind: "judge", trap: "term" })).toBe("概念混淆");
    expect(deriveWrongTag({ kind: "judge", trap: "verbatim" })).toBe("概念混淆");
    expect(deriveWrongTag({ kind: "mcq" })).toBe("概念混淆");
    expect(deriveWrongTag({ kind: "fill" })).toBe("概念混淆");
    expect(deriveWrongTag({ kind: "multi" })).toBe("条件遗漏");
    expect(deriveWrongTag({ kind: "order" })).toBe("顺序错乱");
    expect(deriveWrongTag({ kind: "mcq", picked: "商鞅", answer: "李悝" })).toBe("人物错配");
  });

  it("tallyWrongTags 聚合计数与 topWrongTags 排序", () => {
    const tally = tallyWrongTags([
      { kind: "judge", trap: "number" },
      { kind: "multi" },
      { kind: "multi" },
      { kind: "mcq" },
    ]);
    expect(tally["数字记错"]).toBe(1);
    expect(tally["条件遗漏"]).toBe(2);
    expect(topWrongTags(tally)).toEqual(["条件遗漏", "数字记错"]);
    expect(topWrongTags(undefined)).toEqual([]);
  });
});
