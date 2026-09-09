import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { LawBook } from "../types/law";
import {
  buildProvisionsIndex,
  cnNumberToNumber,
  normalizeLawName,
  parseLawRefs,
  provisionHref,
  provisionSortKey,
  splitLawRefTokens,
} from "./law-provisions";

const SUBJECTS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"] as const;

/** 与构建脚本同源的五本书（真实语料回归） */
const books = Object.fromEntries(
  SUBJECTS.map((id) => [
    id,
    (JSON.parse(
      readFileSync(resolve(__dirname, "../data/law", `${id}.json`), "utf8"),
    ) as { book: LawBook }).book,
  ]),
) as Record<(typeof SUBJECTS)[number], LawBook>;

describe("cnNumberToNumber", () => {
  it("中文数字与阿拉伯数字互换识别", () => {
    expect(cnNumberToNumber("143")).toBe(143);
    expect(cnNumberToNumber("三")).toBe(3);
    expect(cnNumberToNumber("十")).toBe(10);
    expect(cnNumberToNumber("十四")).toBe(14);
    expect(cnNumberToNumber("二十")).toBe(20);
    expect(cnNumberToNumber("一百四十三")).toBe(143);
    expect(cnNumberToNumber("二百零五")).toBe(205);
    expect(cnNumberToNumber("三百八十三")).toBe(383);
    expect(cnNumberToNumber("〇")).toBe(0);
  });

  it("认不出的串返回 null", () => {
    expect(cnNumberToNumber("")).toBeNull();
    expect(cnNumberToNumber("abc")).toBeNull();
    expect(cnNumberToNumber("第十四条")).toBeNull();
  });
});

describe("normalizeLawName", () => {
  it("剥离 OCR 残留书名号与空白", () => {
    expect(normalizeLawName("刑法")).toBe("刑法");
    expect(normalizeLawName("《刑法")).toBe("刑法");
    expect(normalizeLawName("民法典》")).toBe("民法典");
    expect(normalizeLawName(" 民法典 ")).toBe("民法典");
  });

  it("噪声名字丢弃", () => {
    expect(normalizeLawName("《")).toBeNull();
    expect(normalizeLawName("x")).toBeNull();
    expect(normalizeLawName("刑阴件（官工贝）债法")).toBeNull();
    expect(normalizeLawName("民法《典")).toBeNull();
  });
});

describe("parseLawRefs", () => {
  it("模式1：书名号 + 阿拉伯条号 + 款号", () => {
    const refs = parseLawRefs("根据《民法典》第143条第2款的规定");
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({
      law: "民法典",
      article: "143",
      clause: "2",
      articleNumber: 143,
      clauseNumber: 2,
    });
  });

  it("模式1：中文条号与「之X」", () => {
    const refs = parseLawRefs("《刑法》第三条");
    expect(refs[0]).toMatchObject({ law: "刑法", article: "3", articleNumber: 3, clause: null });

    const withSuffix = parseLawRefs("依《刑法》第三百八十三条之一第2款");
    expect(withSuffix).toHaveLength(1);
    expect(withSuffix[0]).toMatchObject({
      law: "刑法",
      article: "383之1",
      clause: "2",
      articleNumber: 383,
      suffixNumber: 1,
    });
  });

  it("模式2：依/根据《法律名》无条号 → 仅记法律名", () => {
    const refs = parseLawRefs("根据《刑事诉讼法》的规则处理");
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ law: "刑事诉讼法", article: "", clause: null, articleNumber: null });
  });

  it("模式2 与模式1 重叠时不产生重复记录（依《X》第Y条 只算一条）", () => {
    const refs = parseLawRefs("依《行政诉讼法》第25条提起诉讼");
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ law: "行政诉讼法", article: "25" });
  });

  it("一段多引全部命中", () => {
    const both = parseLawRefs("《刑法》第14条，《民法典》第一百四十三条");
    expect(both).toHaveLength(2);
    expect(both[0].law).toBe("刑法");
    expect(both[1].law).toBe("民法典");
    expect(both[1].article).toBe("143");
  });

  it("省略主语的连续条号沿用同一法名（《立法法》第11条和第12条）", () => {
    const refs = parseLawRefs("《立法法》第11条和第12条规定，对公民政治权利的剥夺");
    expect(refs).toHaveLength(2);
    expect(refs[0]).toMatchObject({ law: "立法法", article: "11" });
    expect(refs[1]).toMatchObject({ law: "立法法", article: "12" });

    // 款号也能承接；《刑法》第14条和第15条
    const two = parseLawRefs("《刑法》第14条和第15条");
    expect(two.map((ref) => ref.article)).toEqual(["14", "15"]);

    // 连接词后若不是条号（"第11条以及相关……"断了）不再误接
    const broken = parseLawRefs("《立法法》第11条以及相关解释和第12条的类比");
    expect(broken.map((ref) => ref.article)).toEqual(["11"]);
  });

  it("无引用文本返回空数组", () => {
    expect(parseLawRefs("这里没有任何引用")).toEqual([]);
    expect(parseLawRefs("")).toEqual([]);
  });
});

describe("splitLawRefTokens", () => {
  it("文本切成 text/ref 交替段，ref 段还原原文", () => {
    const tokens = splitLawRefTokens("前文《刑法》第14条后文");
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({ type: "text", text: "前文" });
    expect(tokens[1].type).toBe("ref");
    if (tokens[1].type === "ref") {
      expect(tokens[1].text).toBe("《刑法》第14条");
      expect(tokens[1].ref.article).toBe("14");
    }
    expect(tokens[2]).toEqual({ type: "text", text: "后文" });
  });

  it("无引用时整段原样返回", () => {
    expect(splitLawRefTokens("普通原文")).toEqual([{ type: "text", text: "普通原文" }]);
  });
});

describe("provisionSortKey / provisionHref", () => {
  it("条号升序、之Y 排在本条款号后、无条号垫底", () => {
    const key = (article: number | null, suffix: number | null, clause: number | null) =>
      provisionSortKey({ articleNumber: article, suffixNumber: suffix, clauseNumber: clause });
    expect(key(14, null, null)).toBeLessThan(key(14, null, 1));
    expect(key(14, null, 2)).toBeLessThan(key(17, null, null));
    expect(key(383, null, 3)).toBeLessThan(key(383, 1, null));
    expect(key(383, 1, null)).toBeLessThan(key(384, null, null));
    expect(key(null, null, null)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("深链带 law+article，模式2 只带 law", () => {
    expect(provisionHref("民法典", "143")).toBe("/law/provisions?law=%E6%B0%91%E6%B3%95%E5%85%B8&article=143");
    expect(provisionHref("刑事诉讼法", "")).toBe("/law/provisions?law=%E5%88%91%E4%BA%8B%E8%AF%89%E8%AE%BC%E6%B3%95");
  });
});

describe("buildProvisionsIndex", () => {
  it("跨课去重课时列表、累加计数、条号排序、无条号垫底", () => {
    const mkLesson = (id: string, texts: string[]) => ({
      id,
      subject: "xingfa" as const,
      code: "1",
      breadcrumb: ["刑法"],
      title: `课 ${id}`,
      intro: "",
      pageRange: [1, 2],
      raw: [],
      steps: texts.map((text, index) => ({ id: `${id}-s${index}`, kind: "plain" as const, text })),
    });
    const book = {
      id: "xingfa" as const,
      name: "刑法",
      fullName: "刑法",
      emoji: "🛡️",
      accent: "#000",
      accentSoft: "#fff",
      lessonCount: 2,
      leftover: [],
      chapters: [
        {
          id: "c1",
          title: "总则",
          level: "chapter" as const,
          lessons: [
            mkLesson("x-q1", ["《刑法》第14条", "再提《刑法》第14条"]),
            mkLesson("x-q2", ["《刑法》第14条第1款", "《民法典》第143条"]),
          ],
        },
      ],
    } as unknown as LawBook;

    const index = buildProvisionsIndex([{ subject: "xingfa", book }]);
    expect(index.totalProvisions).toBe(3);
    expect(index.totalReferences).toBe(4);

    const article14 = index.provisions.find((p) => p.law === "刑法" && p.article === "14" && p.clause === null);
    expect(article14?.count).toBe(2); // x-q1 内两次，无款
    expect(article14?.lessons.map((l) => l.lessonId)).toEqual(["x-q1"]);
    // 第14条第1款 是分立条目（键 = 法名+条号+款号）
    const clause14 = index.provisions.find((p) => p.law === "刑法" && p.article === "14" && p.clause === "1");
    expect(clause14?.count).toBe(1);
    expect(clause14?.lessons.map((l) => l.lessonId)).toEqual(["x-q2"]);

    // 排序：法名码点序（刑 U+5211 < 民 U+6C11 → 刑法在前）；同法内 14 < 14(款1)
    const keys = index.provisions.map((p) => `${p.law}|${p.article}|${p.clause ?? ""}`);
    expect(keys[0]).toBe("刑法|14|");
    expect(keys[1]).toBe("刑法|14|1");
    expect(keys[2]).toBe("民法典|143|");
  });

  it("真实五本语料：产出规模合理且引用计数守恒", () => {
    const index = buildProvisionsIndex(SUBJECTS.map((subject) => ({ subject, book: books[subject] })));
    expect(index.totalProvisions).toBeGreaterThan(80);
    expect(index.totalProvisions).toBeLessThan(500);
    expect(index.totalReferences).toBeGreaterThan(200);
    // 计数守恒：各条 count 之和 = 总引用
    expect(index.provisions.reduce((sum, p) => sum + p.count, 0)).toBe(index.totalReferences);
    // 课时列表跨课去重：lessons.length ≤ count 恒成立
    for (const provision of index.provisions) {
      expect(provision.lessons.length).toBeLessThanOrEqual(provision.count);
      expect(provision.law.length).toBeGreaterThanOrEqual(2);
      for (const lesson of provision.lessons) {
        expect(lesson.lessonId).toMatch(new RegExp(`^${lesson.subject}-q`));
      }
    }
    // 幂等：同一输入重跑输出一致
    const again = buildProvisionsIndex(SUBJECTS.map((subject) => ({ subject, book: books[subject] })));
    expect(again).toEqual(index);
  });

  it("索引与提交的 JSON 产物一致（脚本重跑不漂移）", () => {
    const committed = JSON.parse(
      readFileSync(resolve(__dirname, "../data/law/provisions-index.json"), "utf8"),
    );
    expect(buildProvisionsIndex(SUBJECTS.map((subject) => ({ subject, book: books[subject] })))).toEqual(committed);
  });
});
