import { describe, expect, it } from "vitest";
import type { LawLessonProgress, LawProgressMap } from "../../../lib/law-progress";
import { describeDue, describeStage, groupWrongLessons, wrongTotalOf } from "./wrongbookGroups";

const DAY = 86_400_000;
const NOW = Date.parse("2026-09-08T10:00:00");

function entry(overrides: Partial<LawLessonProgress>): LawLessonProgress {
  return {
    stepsDone: {},
    quizBest: 0,
    quizTotal: 4,
    wrongCount: 1,
    lastVisitedAt: NOW,
    ...overrides,
  };
}

describe("wrongbookGroups", () => {
  it("把错题按到期状态分成三组，非错题不进组", () => {
    const progress: LawProgressMap = {
      // 今天到期（reviewDueAt 已过）
      "xianfa-q001": entry({ wrongAt: NOW - 2 * DAY, reviewStage: 0, reviewDueAt: NOW - 1000 }),
      // 明天到期
      "minfa-q010": entry({ wrongAt: NOW - DAY, reviewStage: 1, reviewDueAt: NOW + DAY }),
      // 3 天后到期
      "minfa-q003": entry({ wrongAt: NOW - DAY, reviewStage: 2, reviewDueAt: NOW + 3 * DAY }),
      // 毕业历史：五轮全过后 reviewDueAt 被清空
      "falixue-q005": entry({ wrongAt: NOW - 30 * DAY, reviewStage: 5, completedAt: NOW - DAY }),
      // 从没答错 → 不进错题本
      "xingfa-q001": entry({ wrongCount: 0, completedAt: NOW }),
    };
    const groups = groupWrongLessons(progress, NOW);
    expect(groups.dueToday.map((item) => item.lessonId)).toEqual(["xianfa-q001"]);
    expect(groups.upcoming.map((item) => item.lessonId)).toEqual(["minfa-q010", "minfa-q003"]);
    expect(groups.graduated.map((item) => item.lessonId)).toEqual(["falixue-q005"]);
    expect(wrongTotalOf(groups)).toBe(4);
  });

  it("到期组按最早到期排序，未来组按到期时间升序，毕业组按最近答错排序", () => {
    const progress: LawProgressMap = {
      "xianfa-q002": entry({ wrongAt: NOW - 3 * DAY, reviewDueAt: NOW - 3000 }),
      "xianfa-q001": entry({ wrongAt: NOW - 2 * DAY, reviewDueAt: NOW - 1000 }),
      "minfa-q010": entry({ wrongAt: NOW - DAY, reviewDueAt: NOW + 3 * DAY }),
      "minfa-q003": entry({ wrongAt: NOW - DAY, reviewDueAt: NOW + DAY }),
      "falixue-q005": entry({ wrongAt: NOW - 10 * DAY }),
      "falixue-q002": entry({ wrongAt: NOW - 20 * DAY }),
    };
    const groups = groupWrongLessons(progress, NOW);
    expect(groups.dueToday.map((i) => i.lessonId)).toEqual(["xianfa-q002", "xianfa-q001"]);
    expect(groups.upcoming.map((i) => i.lessonId)).toEqual(["minfa-q003", "minfa-q010"]);
    expect(groups.graduated.map((i) => i.lessonId)).toEqual(["falixue-q005", "falixue-q002"]);
  });

  it("到期文案：今天到期 / N 天后到期 / 毕业", () => {
    expect(describeDue(entry({ reviewDueAt: NOW - 1 }), NOW)).toBe("今天到期");
    expect(describeDue(entry({ reviewDueAt: NOW + DAY }), NOW)).toBe("1 天后到期");
    expect(describeDue(entry({ reviewDueAt: NOW + 3 * DAY }), NOW)).toBe("3 天后到期");
    expect(describeDue(entry({ reviewDueAt: undefined, wrongCount: 2 }), NOW)).toContain("已毕业");
    expect(describeStage(entry({ reviewStage: 0, reviewDueAt: NOW }))).toBe("第 1/5 轮");
    expect(describeStage(entry({ reviewDueAt: undefined }))).toBe("");
  });

  it("全空的进度表得到空组", () => {
    const groups = groupWrongLessons({}, NOW);
    expect(wrongTotalOf(groups)).toBe(0);
  });
});
