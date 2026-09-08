import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BASE_REVIEW_INTERVALS,
  memoryStrength,
  nextReviewDueAt,
  reviewDifficulty,
  strengthLabel,
} from "./law-review";
import { getLessonProgress, recordQuiz } from "./law-progress";

const DAY = 86_400_000;
const NOW = new Date("2026-09-09T10:00:00").getTime();

describe("T4 自适应复习算法（纯函数）", () => {
  it("难度系数落在 [0.6, 1.8] 且分层正确", () => {
    // 无作答数据 → 中性 1.0
    expect(reviewDifficulty({})).toBe(1.0);
    // 正确率分层（wrongCount=1 不加压）
    expect(reviewDifficulty({ quizBest: 4, quizTotal: 4, wrongCount: 1 })).toBe(1.5);
    expect(reviewDifficulty({ quizBest: 3, quizTotal: 4, wrongCount: 1 })).toBe(1.3);
    expect(reviewDifficulty({ quizBest: 2, quizTotal: 4, wrongCount: 1 })).toBe(1.1);
    expect(reviewDifficulty({ quizBest: 1, quizTotal: 4, wrongCount: 1 })).toBe(0.7);
    // 错误次数加压
    expect(reviewDifficulty({ quizBest: 4, quizTotal: 4, wrongCount: 2 })).toBe(1.4);
    expect(reviewDifficulty({ quizBest: 4, quizTotal: 4, wrongCount: 3 })).toBe(1.3);
    expect(reviewDifficulty({ quizBest: 4, quizTotal: 4, wrongCount: 9 })).toBe(1.2);
    // 极端输入夹紧在边界
    expect(reviewDifficulty({ quizBest: 0, quizTotal: 4, wrongCount: 99 })).toBe(0.6);
    expect(reviewDifficulty({ quizBest: 99, quizTotal: 100, wrongCount: 0 })).toBe(1.5);
  });

  it("nextReviewDueAt：基础间隔 × 系数，四舍五入且至少 1 天", () => {
    // 掌握好（1.5）：stage1 基础 2 天 → 3 天
    expect(nextReviewDueAt(1, { quizBest: 4, quizTotal: 4 }, NOW)).toBe(NOW + 3 * DAY);
    // 常错（0.6）：stage1 基础 2 天 → round(1.2)=1 天
    expect(nextReviewDueAt(1, { quizBest: 1, quizTotal: 4, wrongCount: 9 }, NOW)).toBe(NOW + 1 * DAY);
    // stage0 基础 1 天 × 0.6 = 0.6 → 至少 1 天
    expect(nextReviewDueAt(0, { quizBest: 0, quizTotal: 4, wrongCount: 9 }, NOW)).toBe(NOW + 1 * DAY);
    // stage 越界按末端夹紧（15 天档）
    expect(nextReviewDueAt(99, { quizBest: 4, quizTotal: 4 }, NOW)).toBe(NOW + Math.round(15 * 1.5) * DAY);
  });

  it("memoryStrength：毕业=3 星，正确率分层，无自测=1 星", () => {
    expect(memoryStrength({ wrongCount: 2, reviewStage: 5, reviewDueAt: undefined })).toBe(3);
    expect(memoryStrength({ quizBest: 4, quizTotal: 4 })).toBe(3);
    expect(memoryStrength({ quizBest: 3, quizTotal: 4 })).toBe(2); // 0.75
    expect(memoryStrength({ quizBest: 2, quizTotal: 4 })).toBe(1); // 0.5 未过半不算两星
    expect(memoryStrength({ quizBest: 1, quizTotal: 4 })).toBe(1);
    expect(memoryStrength({})).toBe(1);
    // 毕业判定要求阶段满（dueAt 空但阶段不足的异常数据不算牢）
    expect(memoryStrength({ wrongCount: 2, reviewStage: 3, reviewDueAt: undefined })).toBe(1);
  });

  it("strengthLabel 三档文案", () => {
    expect(strengthLabel(1)).toBe("★☆☆");
    expect(strengthLabel(2)).toBe("★★☆");
    expect(strengthLabel(3)).toBe("★★★");
  });

  it("BASE_REVIEW_INTERVALS 与既有固定间隔基线一致（阶段/毕业口径不变）", () => {
    expect(BASE_REVIEW_INTERVALS).toEqual([1, 2, 4, 7, 15]);
  });
});

describe("T4 存量数据无损迁移（recordQuiz 集成）", () => {
  function stubStorage(seed?: string) {
    const map = new Map<string, string>();
    if (seed) map.set("nhb-law-academy-v1", seed);
    const storage = {
      getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
      setItem: (key: string, value: string) => map.set(key, value),
      removeItem: (key: string) => map.delete(key),
      clear: () => map.clear(),
      key: (index: number) => [...map.keys()][index] ?? null,
      get length() {
        return map.size;
      },
    };
    vi.stubGlobal("window", { localStorage: storage });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("已有 reviewDueAt 的课不动：旧到期时间原样保留，直到下一次事件才按新算法起算", () => {
    // 昨晚存量：固定间隔时代的到期时间（now + 2 天）
    const legacyDue = NOW + 2 * DAY;
    stubStorage(
      JSON.stringify({
        version: 1,
        lastLessonId: "minfa-q001",
        lessons: {
          "minfa-q001": {
            stepsDone: {},
            quizBest: 2,
            quizTotal: 4,
            wrongCount: 1,
            lastVisitedAt: NOW - DAY,
            wrongAt: NOW - DAY,
            reviewStage: 0,
            reviewDueAt: legacyDue,
          },
        },
      }),
    );
    // 只读不写（touchLesson 透传）：dueAt 不变
    const before = getLessonProgress("minfa-q001");
    expect(before?.reviewDueAt).toBe(legacyDue);
    expect(before?.reviewStage).toBe(0);

    // 到期后复习通过：stage 0→1；quizBest 取历史最优（4/4→系数1.5）→ round(2×1.5)=3 天后
    vi.setSystemTime(new Date(legacyDue));
    recordQuiz("minfa-q001", 4, 4, 1);
    const after = getLessonProgress("minfa-q001");
    expect(after?.reviewStage).toBe(1);
    expect(after?.reviewDueAt).toBe(legacyDue + 3 * DAY);
  });

  it("老阶梯语义保留：五连过毕业口径不变（毕业条目不再安排复习）", () => {
    stubStorage(
      JSON.stringify({
        version: 1,
        lastLessonId: "xingfa-q009",
        lessons: {
          "xingfa-q009": {
            stepsDone: {},
            quizBest: 4,
            quizTotal: 4,
            wrongCount: 1,
            lastVisitedAt: NOW - 10 * DAY,
            wrongAt: NOW - 10 * DAY,
            reviewStage: 4,
            reviewDueAt: NOW - 1000,
          },
        },
      }),
    );
    recordQuiz("xingfa-q009", 4, 4, 1);
    const entry = getLessonProgress("xingfa-q009");
    expect(entry?.reviewStage).toBe(5);
    expect(entry?.reviewDueAt).toBeUndefined(); // 毕业
    expect(memoryStrength(entry ?? {})).toBe(3);
  });

  it("新错题建档即用自适应：全错课的首次复习仍在 1 天后（最短间隔兜底）", () => {
    stubStorage();
    recordQuiz("falixue-q001", 0, 4, 1);
    const entry = getLessonProgress("falixue-q001");
    expect(entry?.reviewDueAt).toBe(NOW + 1 * DAY);
    // 2/4 恰好及格（及格线=半数）：不进错题本、不安排复习
    recordQuiz("falixue-q002", 2, 4, 1);
    expect(getLessonProgress("falixue-q002")?.reviewDueAt).toBeUndefined();
  });

  it("自适应间隔可长于固定间隔：高正确率课的 stage3 复习推得更远", () => {
    stubStorage(
      JSON.stringify({
        version: 1,
        lastLessonId: "xianfa-q005",
        lessons: {
          "xianfa-q005": {
            stepsDone: {},
            quizBest: 4,
            quizTotal: 4,
            wrongCount: 1,
            lastVisitedAt: NOW - DAY,
            wrongAt: NOW - DAY,
            reviewStage: 2,
            reviewDueAt: NOW - 2000,
          },
        },
      }),
    );
    recordQuiz("xianfa-q005", 4, 4, 1);
    // stage2→3：基础 7 天 × 1.5 = 10.5 → 11 天（固定算法是 7 天）
    expect(getLessonProgress("xianfa-q005")?.reviewDueAt).toBe(NOW + 11 * DAY);
  });
});
