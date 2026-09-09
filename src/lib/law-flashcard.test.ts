import { describe, expect, it } from "vitest";
import type { LawLesson, LawStep } from "../types/law";
import type { LawProgressMap } from "./law-progress";
import {
  buildFlashcards,
  FLASHCARD_BACK_MAX,
  FLASHCARD_TERMS_PER_LESSON,
  getDueFlashcards,
  mineDefinitionHead,
  orderLessonsByPriority,
  subjectOfLessonId,
  summarizeContext,
} from "./law-flashcard";

const NOW = new Date("2026-09-10T08:00:00").getTime();
const DAY = 86_400_000;

function step(overrides: Partial<LawStep> = {}): LawStep {
  return { id: "s", kind: "definition", text: "步骤原文", ...overrides };
}

function lesson(overrides: Partial<LawLesson> & { id: string; subject: LawLesson["subject"] }): LawLesson {
  return {
    code: "一",
    breadcrumb: ["测试书"],
    title: `课时 ${overrides.id}`,
    intro: "课时简介。",
    steps: [],
    pageRange: [1, 2],
    raw: [],
    ...overrides,
  };
}

function progressEntry(overrides: Partial<import("./law-progress").LawLessonProgress> = {}) {
  return {
    stepsDone: { a: true },
    quizBest: 4,
    quizTotal: 4,
    wrongCount: 0,
    lastVisitedAt: NOW - DAY,
    completedAt: NOW - DAY,
    ...overrides,
  };
}

describe("闪卡数据引擎", () => {
  it("空数据：无进度/无课时/全未完成时出 0 张卡", () => {
    expect(buildFlashcards({}, [])).toEqual([]);
    expect(buildFlashcards({}, [lesson({ id: "minfa-q001", subject: "minfa" })])).toEqual([]);
    expect(buildFlashcards({ "minfa-q001": progressEntry({ completedAt: undefined }) }, [
      lesson({ id: "minfa-q001", subject: "minfa" }),
    ])).toEqual([]);
    expect(getDueFlashcards({}, NOW)).toEqual([]);
  });

  it("单课：标题卡 + 术语卡最多 5 张，背面 ≤80 字，术语来自步骤 terms", () => {
    const rich = lesson({
      id: "xingfa-q010",
      subject: "xingfa",
      title: "犯罪构成",
      intro: "犯罪构成是刑法规定的、成立犯罪所必需的一切主观要件与客观要件的总和。",
      steps: [
        step({ text: "犯罪构成包括犯罪客体、犯罪客观方面、犯罪主体、犯罪主观方面四个要件。", terms: [
          { term: "犯罪构成" },
          { term: "犯罪客体" },
          { term: "犯罪客观方面" },
          { term: "犯罪主体" },
          { term: "犯罪主观方面" },
          { term: "犯罪对象" },
        ] }),
      ],
    });
    const cards = buildFlashcards({ "xingfa-q010": progressEntry() }, [rich], undefined, "all", NOW);
    expect(cards).toHaveLength(1 + FLASHCARD_TERMS_PER_LESSON);
    expect(cards[0]).toMatchObject({ front: "犯罪构成", kind: "lesson", rank: 3, lessonId: "xingfa-q010" });
    expect(cards[1]).toMatchObject({ front: "犯罪客体", kind: "term" });
    // 与课时标题同名的术语（"犯罪构成"）不再重复出卡
    expect(cards.filter((card) => card.front === "犯罪构成")).toHaveLength(1);
    expect(cards[1].back).toContain("四个要件");
    for (const card of cards) {
      expect(card.back.length).toBeLessThanOrEqual(FLASHCARD_BACK_MAX);
      expect(card.id).toMatch(/^xingfa-q010#\d+$/);
    }
  });

  it("subjectFilter：只保留指定学科的卡", () => {
    const a = lesson({ id: "minfa-q001", subject: "minfa", title: "民法课", steps: [step({ text: "民法调整平等主体。", terms: [{ term: "民事法律关系" }] })] });
    const b = lesson({ id: "xingfa-q001", subject: "xingfa", title: "刑法课", steps: [step({ text: "刑法规定犯罪与刑罚。", terms: [{ term: "罪刑法定原则" }] })] });
    const progress: LawProgressMap = { "minfa-q001": progressEntry(), "xingfa-q001": progressEntry() };
    const cards = buildFlashcards(progress, [a, b], "xingfa", "all", NOW);
    expect(cards.map((card) => card.subject)).toEqual(["xingfa", "xingfa"]);
    expect(cards.map((card) => card.front)).toEqual(["刑法课", "罪刑法定原则"]);
    // "all" 与缺省等价
    expect(buildFlashcards(progress, [a, b], "all", "all", NOW)).toHaveLength(4);
  });

  it("错题优先排序：到期错题课在前（按 reviewDueAt 升序），未到期错题课次之", () => {
    const dueLate = lesson({ id: "minfa-q001", subject: "minfa", steps: [step({ text: "晚到期的错题课。", terms: [{ term: "表见代理" }] })] });
    const dueEarly = lesson({ id: "minfa-q002", subject: "minfa", steps: [step({ text: "早到期的错题课。", terms: [{ term: "无权代理" }] })] });
    const wrongFuture = lesson({ id: "minfa-q003", subject: "minfa", steps: [step({ text: "未到期的错题课。", terms: [{ term: "狭义无权代理" }] })] });
    const plain = lesson({ id: "minfa-q004", subject: "minfa", steps: [step({ text: "普通完成课。", terms: [{ term: "善意取得" }] })] });
    const progress: LawProgressMap = {
      "minfa-q001": progressEntry({ wrongCount: 2, wrongAt: NOW - 3 * DAY, reviewStage: 1, reviewDueAt: NOW + DAY }),
      "minfa-q002": progressEntry({ wrongCount: 1, wrongAt: NOW - 2 * DAY, reviewStage: 0, reviewDueAt: NOW - 3600_000 }),
      "minfa-q003": progressEntry({ wrongCount: 1, wrongAt: NOW - DAY, reviewStage: 0, reviewDueAt: NOW + 5 * DAY }),
      "minfa-q004": progressEntry(),
    };
    const cards = buildFlashcards(progress, [plain, wrongFuture, dueLate, dueEarly], undefined, "all", NOW);
    // 每课出 2 张（标题 + 术语）：q002 占 0-1、q001 占 2-3、q003 占 4-5、q004 占 6-7
    expect(cards[0]).toMatchObject({ lessonId: "minfa-q002", rank: 0 });
    expect(cards[2]).toMatchObject({ lessonId: "minfa-q001", rank: 1 });
    expect(cards[4]).toMatchObject({ lessonId: "minfa-q003", rank: 1 });
    expect(cards[6]).toMatchObject({ lessonId: "minfa-q004", rank: 3 });
  });

  it("术语去重：同一术语整副牌只出现一次，优先级高的课先认领", () => {
    const due = lesson({ id: "minfa-q001", subject: "minfa", steps: [step({ text: "错题课先讲法人制度。", terms: [{ term: "法人制度" }, { term: "法人民事行为能力" }] })] });
    const plain = lesson({ id: "minfa-q002", subject: "minfa", steps: [step({ text: "普通课重复法人制度。", terms: [{ term: "法人制度" }, { term: "法人代表" }] })] });
    const progress: LawProgressMap = {
      "minfa-q001": progressEntry({ wrongCount: 1, reviewStage: 0, reviewDueAt: NOW - DAY }),
      "minfa-q002": progressEntry(),
    };
    const cards = buildFlashcards(progress, [plain, due], undefined, "all", NOW);
    const termFronts = cards.filter((card) => card.kind === "term").map((card) => card.front);
    expect(termFronts.filter((front) => front === "法人制度")).toHaveLength(1);
    expect(cards.find((card) => card.front === "法人制度")?.lessonId).toBe("minfa-q001");
    expect(termFronts).toContain("法人代表");
  });

  it("scope：wrong 只出未毕业错题课，fresh 只出从未复习的完成课", () => {
    const wrong = lesson({ id: "minfa-q001", subject: "minfa", steps: [step({ text: "错题课。", terms: [{ term: "抵押权" }] })] });
    const fresh = lesson({ id: "minfa-q002", subject: "minfa", steps: [step({ text: "跳过自测完成。", terms: [{ term: "动产质权" }] })] });
    const quizzed = lesson({ id: "minfa-q003", subject: "minfa", steps: [step({ text: "自测通过完成。", terms: [{ term: "留置权" }] })] });
    const progress: LawProgressMap = {
      "minfa-q001": progressEntry({ wrongCount: 1, reviewStage: 0, reviewDueAt: NOW + DAY }),
      "minfa-q002": progressEntry({ quizBest: 0, quizTotal: 0 }),
      "minfa-q003": progressEntry(),
    };
    const wrongCards = buildFlashcards(progress, [wrong, fresh, quizzed], undefined, "wrong", NOW);
    expect(wrongCards.map((card) => card.lessonId)).toEqual(["minfa-q001", "minfa-q001"]);
    const freshCards = buildFlashcards(progress, [wrong, fresh, quizzed], undefined, "fresh", NOW);
    expect(freshCards.map((card) => card.lessonId)).toEqual(["minfa-q002", "minfa-q002"]);
  });

  it("getDueFlashcards：只返回到期错题课 + 从未复习的完成课，按到期/完成时间升序", () => {
    const progress: LawProgressMap = {
      "minfa-q001": progressEntry({ wrongCount: 1, reviewStage: 0, reviewDueAt: NOW + DAY }),
      "minfa-q002": progressEntry({ wrongCount: 1, reviewStage: 0, reviewDueAt: NOW - 2 * DAY }),
      "minfa-q003": progressEntry({ quizBest: 0, quizTotal: 0, completedAt: NOW - 5 * DAY }),
      "minfa-q004": progressEntry({ quizBest: 0, quizTotal: 0, completedAt: NOW - 3 * DAY }),
      // 已毕业错题课（五轮全过）与未完成课都不该出现
      "minfa-q005": progressEntry({ wrongCount: 2, reviewStage: 5, reviewDueAt: undefined }),
      "minfa-q006": progressEntry({ completedAt: undefined }),
      // 非课时 id 无学科前缀，跳过
      "orphan": progressEntry({ quizBest: 0, quizTotal: 0 }),
    };
    const due = getDueFlashcards(progress, NOW);
    expect(due.map((ref) => ref.lessonId)).toEqual(["minfa-q002", "minfa-q003", "minfa-q004"]);
    expect(due[0]).toMatchObject({ reason: "due", subject: "minfa", dueAt: NOW - 2 * DAY });
    expect(due[1]).toMatchObject({ reason: "fresh" });
  });

  it("兜底出卡：无干净术语的课从步骤要点补到 2 张；彻底无内容的课只有标题卡", () => {
    const partsOnly = lesson({
      id: "xianfa-q001",
      subject: "xianfa",
      steps: [step({ kind: "list", text: "公民的基本义务包括下列各项。", parts: ["维护国家统一", "依法纳税", "劳动的义务"] })],
    });
    const progress: LawProgressMap = { "xianfa-q001": progressEntry() };
    const cards = buildFlashcards(progress, [partsOnly], undefined, "all", NOW);
    expect(cards).toHaveLength(2);
    expect(cards[1].front).toBe("维护国家统一");
    // isCleanTerm 拒收的 2 字术语（如"假释"）不算干净术语 → 走兜底
    expect(cards.map((card) => card.kind)).toEqual(["lesson", "term"]);

    const bare = lesson({ id: "xianfa-q002", subject: "xianfa", steps: [step({ text: "只有一句话。" })] });
    const bareCards = buildFlashcards({ "xianfa-q002": progressEntry() }, [bare], undefined, "all", NOW);
    expect(bareCards).toHaveLength(1);
    expect(bareCards[0].kind).toBe("lesson");

    const mnemonicOnly = lesson({ id: "xianfa-q003", subject: "xianfa", mnemonic: "一二三四五，上山打老虎", steps: [step({ text: "口诀课。" })] });
    const mnemonicCards = buildFlashcards({ "xianfa-q003": progressEntry() }, [mnemonicOnly], undefined, "all", NOW);
    expect(mnemonicCards).toHaveLength(2);
    expect(mnemonicCards[1]).toMatchObject({ kind: "mnemonic", front: "课时 xianfa-q003 · 口诀" });
  });

  it("summarizeContext：超长文本在句读处截断且 ≤80 字；短文本原样返回", () => {
    const short = "短句。";
    expect(summarizeContext(short)).toBe(short);
    expect(summarizeContext("   多  空  格  ")).toBe("多 空 格");
    const long = "这是一个特别长的段落，用来验证摘要截断。".repeat(6);
    const summary = summarizeContext(long);
    expect(summary.length).toBeLessThanOrEqual(FLASHCARD_BACK_MAX);
    expect(summary.endsWith("……")).toBe(true);
    // 句读处截断：省略号前一个字符应是句读
    expect(["。", "；", "！", "？", "，", "、"]).toContain(summary.at(-3));
  });

  it("orderLessonsByPriority 与 buildFlashcards 的牌序口径一致", () => {
    const progress: LawProgressMap = {
      "minfa-q001": progressEntry({ wrongCount: 1, reviewStage: 0, reviewDueAt: NOW - DAY }),
      "minfa-q002": progressEntry({ quizBest: 0, quizTotal: 0 }),
      "minfa-q003": progressEntry(),
    };
    expect(orderLessonsByPriority(progress, ["minfa-q003", "minfa-q002", "minfa-q001"], NOW))
      .toEqual(["minfa-q001", "minfa-q002", "minfa-q003"]);
  });

  it("定义主语挖掘：从「X，是指Y」句式补出术语卡（terms 缺失时的主力）", () => {
    expect(mineDefinitionHead("犯罪构成，是指刑法规定的成立犯罪所必需的主观要件和客观要件的总和。")).toBe("犯罪构成");
    expect(mineDefinitionHead("法律部门又称部门法，是指根据一定原则和标准划分的本国同类法律规范的总称。")).toBe("法律部门");
    expect(mineDefinitionHead("1．犯罪客体，是指刑法保护的而为犯罪行为所侵害的社会关系。")).toBe("犯罪客体");
    expect(mineDefinitionHead("所谓法的时间效力，是指法何时生效、何时终止效力。")).toBe("法的时间效力");
    // 无定义句式 / 主语不像术语 → null
    expect(mineDefinitionHead("1.构成一国法律体系的所有部门法是统一的，各个部门法之间是协调的。")).toBeNull();
    expect(mineDefinitionHead("简述法律部门的概念和特征")).toBeNull();

    // 真实数据形态：steps 无 terms，正文是长句 parts → 挖掘出 2-5 张
    const definitionLesson = lesson({
      id: "xingfa-q014",
      subject: "xingfa",
      title: "简述犯罪构成的概念及其内容",
      steps: [
        step({
          text: "犯罪构成，是指刑法规定的成立犯罪必须具备的主观要件和客观要件的总和。犯罪构成要件包括：",
          parts: [
            "犯罪客体，是指刑法保护的而为犯罪行为所侵害的社会关系。",
            "犯罪客观方面，是指犯罪活动的客观外在表现。",
          ],
        }),
      ],
    });
    const cards = buildFlashcards({ "xingfa-q014": progressEntry() }, [definitionLesson], undefined, "all", NOW);
    const fronts = cards.map((card) => card.front);
    expect(fronts).toContain("犯罪构成");
    expect(fronts).toContain("犯罪客体");
    expect(fronts).toContain("犯罪客观方面");
    expect(cards.filter((card) => card.kind === "term").every((card) => card.back.length <= FLASHCARD_BACK_MAX)).toBe(true);
  });

  it("subjectOfLessonId：识别五科前缀，异常 id 返回 null", () => {
    expect(subjectOfLessonId("minfa-q031")).toBe("minfa");
    expect(subjectOfLessonId("falixue-q052")).toBe("falixue");
    expect(subjectOfLessonId("xianfa-q1")).toBe("xianfa");
    expect(subjectOfLessonId("orphan")).toBeNull();
  });
});
