import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  REVIEW_INTERVALS,
  getDueReviewLessons,
  getLessonProgress,
  getReviewInfo,
  getStreakDays,
  getTodayGoal,
  getWrongLessons,
  markStepDone,
  recordQuiz,
  touchLesson,
} from "./law-progress";

/** 极简 localStorage 桩（law-progress 通过 safeLocalStorage 访问 window.localStorage） */
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

const DAY = 86_400_000;

let store: Map<string, string>;

describe("law lesson progress", () => {

  beforeEach(() => {
    store = stubStorage();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T10:00:00"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("records step completion and lesson touch", () => {
    expect(markStepDone("xingfa-q001", "xingfa-q001-s0")).toBe(1);
    expect(markStepDone("xingfa-q001", "xingfa-q001-s1")).toBe(2);
    const progress = getLessonProgress("xingfa-q001");
    expect(progress?.stepsDone["xingfa-q001-s0"]).toBe(true);
    expect(progress?.lastVisitedAt).toBe(Date.now());
    touchLesson("xingfa-q001");
    expect(getLessonProgress("xingfa-q001")?.wrongCount ?? 0).toBe(0);
  });

  it("marks mastery and bumps the daily goal on a passing quiz", () => {
    markStepDone("minfa-q001", "minfa-q001-s0");
    recordQuiz("minfa-q001", 3, 4, 1);
    expect(getLessonProgress("minfa-q001")?.completedAt).toBeDefined();
    expect(getTodayGoal().done).toBe(1);
  });

  it("does not double-count the daily goal for an already-mastered lesson", () => {
    markStepDone("minfa-q001", "minfa-q001-s0");
    recordQuiz("minfa-q001", 3, 4, 1);
    recordQuiz("minfa-q001", 4, 4, 1);
    expect(getTodayGoal().done).toBe(1);
  });
});

describe("law spaced-repetition review book", () => {
  beforeEach(() => {
    store = stubStorage();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T10:00:00"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("schedules the first review the day after a wrong answer", () => {
    recordQuiz("xianfa-q001", 0, 4, 3, true);
    const entry = getLessonProgress("xianfa-q001");
    expect(entry?.wrongCount).toBe(1);
    expect(entry?.reviewStage).toBe(0);
    expect(entry?.reviewDueAt).toBe(Date.now() + REVIEW_INTERVALS[0] * DAY);
    expect(getWrongLessons()).toContain("xianfa-q001");
    // 答错当天未到期，明天到期
    expect(getDueReviewLessons()).not.toContain("xianfa-q001");
    expect(getDueReviewLessons(Date.now() + DAY)).toContain("xianfa-q001");
  });

  it("does not schedule reviews for a lesson never answered wrong", () => {
    recordQuiz("xianfa-q002", 4, 4, 3);
    expect(getLessonProgress("xianfa-q002")?.reviewDueAt).toBeUndefined();
    expect(getWrongLessons()).not.toContain("xianfa-q002");
  });

  it("widens the interval after each passing review and graduates after five passes", () => {
    recordQuiz("zhishixiang-q001", 0, 4, 2, true);
    let due = getLessonProgress("zhishixiang-q001")!.reviewDueAt!;

    for (let stage = 1; stage <= REVIEW_INTERVALS.length; stage += 1) {
      vi.setSystemTime(new Date(due));
      recordQuiz("zhishixiang-q001", 4, 4, 2);
      const entry = getLessonProgress("zhishixiang-q001")!;
      expect(entry.reviewStage).toBe(stage);
      if (stage < REVIEW_INTERVALS.length) {
        expect(entry.reviewDueAt).toBe(Date.now() + REVIEW_INTERVALS[stage] * DAY);
        due = entry.reviewDueAt!;
      } else {
        // 第 5 次通过 → 毕业移出错题本
        expect(entry.reviewDueAt).toBeUndefined();
        expect(getWrongLessons()).not.toContain("zhishixiang-q001");
        expect(getReviewInfo("zhishixiang-q001")).toBeNull();
      }
    }
  });

  it("resets the review ladder when the lesson is answered wrong again", () => {
    recordQuiz("falixue-q001", 0, 2, 1, true);
    vi.setSystemTime(new Date(Date.now() + DAY));
    recordQuiz("falixue-q001", 2, 2, 1);
    expect(getLessonProgress("falixue-q001")?.reviewStage).toBe(1);

    recordQuiz("falixue-q001", 0, 2, 1, true);
    const entry = getLessonProgress("falixue-q001")!;
    expect(entry.reviewStage).toBe(0);
    expect(entry.reviewDueAt).toBe(Date.now() + REVIEW_INTERVALS[0] * DAY);
  });

  it("only lists lessons that are actually due in getDueReviewLessons", () => {
    recordQuiz("falixue-q002", 0, 2, 1, true); // due tomorrow
    recordQuiz("falixue-q003", 0, 2, 1, true); // due tomorrow
    expect(getDueReviewLessons(Date.now())).toHaveLength(0);
    expect(getDueReviewLessons(Date.now() + 2 * DAY)).toHaveLength(2);
  });

  it("counts consecutive completion days as the streak", () => {
    const today = new Date("2026-09-05T10:00:00").getTime();
    markStepDone("xingfa-q010", "s0");
    recordQuiz("xingfa-q010", 2, 2, 1);
    // 今天完成 1 课 → 连续 1 天
    expect(getStreakDays()).toBe(1);
    // 昨天也完成 → 连续 2 天
    store.set(
      "nhb-law-academy-v1",
      JSON.stringify({
        version: 1,
        lastLessonId: "xingfa-q010",
        lessons: {
          "xingfa-q010": { stepsDone: {}, quizBest: 2, quizTotal: 2, wrongCount: 0, lastVisitedAt: today, completedAt: today, wrongAt: undefined, reviewStage: undefined, reviewDueAt: undefined },
          "xingfa-q011": { stepsDone: {}, quizBest: 2, quizTotal: 2, wrongCount: 0, lastVisitedAt: today - DAY, completedAt: today - DAY, wrongAt: undefined, reviewStage: undefined, reviewDueAt: undefined },
        },
      }),
    );
    expect(getStreakDays()).toBe(2);
  });
});
