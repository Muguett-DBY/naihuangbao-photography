import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CONFUSION_PAIRS } from "./law-confusion-data";
import { confusablesOf, preferConfusables } from "./law-confusion";
import { buildQuiz } from "./law-quiz";
import type { LawLesson } from "../types/law";

/** 从生成数据里动态取样——数据重建（S2 管线）后用例依然有效 */
const sampleKey = Object.keys(CONFUSION_PAIRS)[0] ?? "";

describe("T5 干扰项质量库（数据模块）", () => {
  it("生成物非空且结构合法（value 为竖线分隔的非空词表）", () => {
    expect(Object.keys(CONFUSION_PAIRS).length).toBeGreaterThan(300);
    for (const [key, value] of Object.entries(CONFUSION_PAIRS)) {
      expect(key.length).toBeGreaterThanOrEqual(2);
      const partners = value.split("|");
      expect(partners.length).toBeGreaterThanOrEqual(1);
      expect(partners.length).toBeLessThanOrEqual(4);
      for (const partner of partners) {
        expect(partner.length).toBeGreaterThanOrEqual(2);
        expect(partner).not.toBe(key);
        expect(key.includes(partner)).toBe(false); // 子串对不进库（出题侧无法用）
        expect(partner.includes(key)).toBe(false);
      }
    }
  });

  it("confusablesOf：已知词返回伙伴列表，未知词返回空数组", () => {
    expect(confusablesOf("绝对不存在的术词")).toEqual([]);
    if (sampleKey) {
      const partners = confusablesOf(sampleKey);
      expect(partners.length).toBeGreaterThan(0);
      expect(partners).toEqual(CONFUSION_PAIRS[sampleKey].split("|"));
    }
  });

  it("preferConfusables：命中项按对内顺序排前，其余保持原序", () => {
    const pool = ["丙", "甲", "丁", "乙"];
    expect(preferConfusables(pool, "目标")).toEqual(pool); // 无命中 → 原序
    // 构造：目标的伙伴是 乙 和 丁
    const original = CONFUSION_PAIRS["一复奏"];
    expect(original).toBeDefined(); // 法制史复奏制度是稳定数据锚点
    expect(preferConfusables(["随田买卖", "三复奏", "典当买卖", "五复奏"], "一复奏")).toEqual([
      "三复奏",
      "五复奏",
      "随田买卖",
      "典当买卖",
    ]);
  });
});

describe("T5 干扰项质量库（buildQuiz 接线）", () => {
  it("挖空题干扰项优先取高频混淆对（动态锚点：真实对子里造 fixture）", () => {
    // 从数据里找一对互为伙伴的词作为 fixture 的答案与干扰项
    let answer = "";
    let partner = "";
    for (const [key, value] of Object.entries(CONFUSION_PAIRS)) {
      const first = value.split("|")[0];
      if (key.length >= 3 && key.length <= 8 && first.length >= 3 && first.length <= 8) {
        answer = key;
        partner = first;
        break;
      }
    }
    expect(answer).not.toBe("");

    const fixture = {
      id: "fixture-confusion2",
      subject: "zhishixiang",
      code: "一",
      breadcrumb: [],
      title: answer,
      intro: "",
      steps: [
        {
          id: "s0",
          kind: "definition",
          text: `${answer}，是指教材中记载的一项基本制度内容。`,
          terms: [{ term: answer }, { term: partner }, { term: "完全无关词组" }],
        },
      ],
      pageRange: [1, 1],
      raw: [],
    } as unknown as LawLesson;
    const items = buildQuiz(fixture, ["无关概念词甲", "无关概念词乙", "无关概念词丙"]);
    const mcq = items.find((item) => item.kind === "mcq" && item.answer === answer);
    // 混淆伙伴要么在选项里（被优先选中），要么被闸门拦截（子串/题面可见）——
    // fixture 保证无子串关系，故必须选中
    expect(mcq).toBeDefined();
    expect(mcq!.options).toContain(partner);
  });

  it("全库 mcq 干扰项混淆命中率显著高于随机基线（接线回归护栏）", () => {
    // 随机基线实测 2.2%；接线后 8.7%。护栏取 6%：数据小变动不至于误报，接线损坏必红
    const SUBJECTS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"] as const;
    const books = SUBJECTS.map((id) =>
      JSON.parse(readFileSync(resolve(__dirname, `../data/law/${id}.json`), "utf8")).book,
    );
    let total = 0;
    let hits = 0;
    for (const book of books) {
      for (const chapter of book.chapters) {
        for (const lesson of chapter.lessons) {
          if (lesson.shell || lesson.id.endsWith("-tour")) continue;
          const context: string[] = [];
          for (const other of chapter.lessons) {
            if (other.id === lesson.id) continue;
            for (const step of other.steps) {
              for (const t of step.terms ?? []) {
                const c = t.term?.trim().replace(/^[（(【[]|[）)】\]]$/g, "").trim();
                if (c && c.length >= 3 && !context.includes(c)) context.push(c);
              }
            }
          }
          for (const item of buildQuiz(lesson, context)) {
            if (item.kind !== "mcq") continue;
            const partners = confusablesOf(item.answer);
            for (const option of item.options ?? []) {
              if (option === item.answer) continue;
              total += 1;
              if (partners.includes(option)) hits += 1;
            }
          }
        }
      }
    }
    expect(hits / Math.max(total, 1)).toBeGreaterThan(0.06);
  });
});
