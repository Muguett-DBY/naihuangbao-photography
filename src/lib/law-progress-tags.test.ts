import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLawProgress, getLessonProgress, recordQuiz, touchLesson } from "./law-progress";
import { safeLocalStorage } from "./browser-storage";

/** 极简 localStorage 桩（与 law-progress.test.ts 同款手法，独立文件避免并行会话冲突） */
function stubStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
  vi.stubGlobal("window", { localStorage: storage });
  return map;
}

describe("T3 错因标签存储", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = stubStorage();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T10:00:00"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("不及格自测的错题明细按题型聚合成标签计数", () => {
    recordQuiz("zhishixiang-q001", 0, 4, 1, {
      wrongDetails: [
        { kind: "judge", trap: "number", answer: "否" },
        { kind: "multi", picked: "甲、乙", answer: "甲、乙、丙" },
        { kind: "mcq", picked: "错误概念", answer: "正确概念" },
        { kind: "mcq", picked: "另一错", answer: "正确概念" },
      ],
    });
    const progress = getLessonProgress("zhishixiang-q001");
    expect(progress?.wrongTags).toEqual({ 数字记错: 1, 条件遗漏: 1, 概念混淆: 2 });
    expect(progress?.wrongCount).toBe(1);
  });

  it("及格自测同样累积错因标签（及格≠没错）", () => {
    recordQuiz("minfa-q010", 2, 4, 1, {
      wrongDetails: [{ kind: "fill", picked: "错词", answer: "正确术语" }],
    });
    const progress = getLessonProgress("minfa-q010");
    expect(progress?.wrongCount).toBe(0); // 及格不进错题本
    expect(progress?.wrongTags?.概念混淆).toBe(1); // 但错因记下了
  });

  it("多次作答标签计数累加；touchLesson 不丢标签", () => {
    recordQuiz("xingfa-q003", 1, 4, 1, {
      wrongDetails: [
        { kind: "judge", trap: "person" },
        { kind: "order" },
      ],
    });
    recordQuiz("xingfa-q003", 1, 4, 1, {
      wrongDetails: [{ kind: "order" }],
    });
    expect(getLessonProgress("xingfa-q003")?.wrongTags).toEqual({ 人物错配: 1, 顺序错乱: 2 });
    touchLesson("xingfa-q003");
    expect(getLessonProgress("xingfa-q003")?.wrongTags).toEqual({ 人物错配: 1, 顺序错乱: 2 });
  });

  it("跳过自测不写标签；无明细的旧调用路径不写标签", () => {
    recordQuiz("minfa-q020", 1, 1, 1, { skipped: true });
    recordQuiz("minfa-q021", 0, 4, 1);
    expect(getLessonProgress("minfa-q020")?.wrongTags).toBeUndefined();
    expect(getLessonProgress("minfa-q021")?.wrongTags).toBeUndefined();
  });

  it("旧格式数据（无 wrongTags 字段）无损加载，新标签合并进旧条目", () => {
    // 模拟昨晚存量数据：version 1、条目无 wrongTags
    store.set(
      "nhb-law-academy-v1",
      JSON.stringify({
        version: 1,
        lastLessonId: "falixue-q002",
        lessons: {
          "falixue-q002": {
            stepsDone: { "falixue-q002-s0": true },
            quizBest: 1,
            quizTotal: 4,
            wrongCount: 2,
            lastVisitedAt: 1756000000000,
            wrongAt: 1756000000000,
            reviewStage: 1,
            reviewDueAt: 1757000000000,
          },
        },
      }),
    );
    const before = getLawProgress()["falixue-q002"];
    expect(before?.reviewStage).toBe(1); // 旧语义原样保留
    expect(before?.wrongTags).toBeUndefined();
    // 复习再错：新标签写进同一条目，旧字段不动
    recordQuiz("falixue-q002", 1, 4, 1, {
      wrongDetails: [{ kind: "judge", trap: "cn-number" }],
    });
    const after = getLessonProgress("falixue-q002");
    expect(after?.wrongTags).toEqual({ 数字记错: 1 });
    expect(after?.wrongCount).toBe(3);
    expect(after?.reviewStage).toBe(0);
  });
});

// safeLocalStorage 仅经 window 桩间接使用；引用防止 tree-shake 误报
void safeLocalStorage;
