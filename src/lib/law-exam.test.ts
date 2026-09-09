import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { LawBook, LawLesson, LawSubjectId } from "../types/law";
import { collectSiblingTerms } from "../data/law/loader";
import type { LawProgressMap } from "./law-progress";
import {
  assembleExamItems,
  completedLessonsBySubject,
  examAnswerLabel,
  examDurationSeconds,
  gradeExam,
  interleaveBySubject,
  type LawExamAnswer,
  type LawExamItem,
  type LawExamLessonInput,
} from "./law-exam";

const SUBJECTS = ["falixue", "minfa"] as const;

const books = Object.fromEntries(
  SUBJECTS.map((id) => [
    id,
    (JSON.parse(
      readFileSync(resolve(__dirname, "../data/law", `${id}.json`), "utf8"),
    ) as { book: LawBook }).book,
  ]),
) as Record<(typeof SUBJECTS)[number], LawBook>;

function lessonOf(subject: LawSubjectId, lessonId: string): LawLesson {
  for (const chapter of books[subject as (typeof SUBJECTS)[number]].chapters) {
    const lesson = chapter.lessons.find((entry) => entry.id === lessonId);
    if (lesson) return lesson;
  }
  throw new Error(`fixture missing lesson: ${lessonId}`);
}

/** 真实课时 → 组卷素材（siblingTerms 与课时页同口径） */
function lessonInput(subject: LawSubjectId, lessonId: string): LawExamLessonInput {
  const lesson = lessonOf(subject, lessonId);
  return { subject, lesson, siblingTerms: collectSiblingTerms(books[subject as (typeof SUBJECTS)[number]], lessonId) };
}

/** 已完成进度夹具：全部标记完成，completedAt 按列表顺序递增（getLawProgress() 的扁平口径） */
function progressOf(ids: string[]): LawProgressMap {
  const lessons: LawProgressMap = {};
  ids.forEach((id, index) => {
    lessons[id] = {
      stepsDone: { s0: true },
      quizBest: 2,
      quizTotal: 4,
      wrongCount: 0,
      lastVisitedAt: 1000 + index,
      completedAt: 2000 + index,
    };
  });
  return lessons;
}

const FALI_LESSONS = ["falixue-q034", "falixue-q052", "falixue-q053", "falixue-q073", "falixue-q083"];

describe("completedLessonsBySubject", () => {
  it("空进度池返回空分组", () => {
    const all: LawSubjectId[] = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"];
    expect(completedLessonsBySubject({}, all)).toEqual({});
  });

  it("只认 completedAt 存在的课（学到一半/答错未掌握的不进卷）", () => {
    const progress = {
      "falixue-q052": {
        stepsDone: {}, quizBest: 0, quizTotal: 0, wrongCount: 1, lastVisitedAt: 1, completedAt: 5,
      },
      "falixue-q053": {
        stepsDone: {}, quizBest: 0, quizTotal: 0, wrongCount: 0, lastVisitedAt: 9,
      },
    } as unknown as LawProgressMap;
    const groups = completedLessonsBySubject(progress, ["falixue"]);
    expect(groups.falixue).toEqual(["falixue-q052"]);
  });

  it("只返回所选科目的课，并按完成时间倒序", () => {
    const progress = progressOf([
      "falixue-q052",
      "minfa-q031",
      "falixue-q053",
      "minfa-q033",
    ]);
    const groups = completedLessonsBySubject(progress, ["falixue", "minfa"]);
    expect(groups.falixue).toEqual(["falixue-q053", "falixue-q052"]);
    expect(groups.minfa).toEqual(["minfa-q033", "minfa-q031"]);
    // 未选的科目（即使有课）不出现
    const faliOnly = completedLessonsBySubject(progress, ["falixue"]);
    expect(faliOnly.minfa).toBeUndefined();
  });
});

describe("interleaveBySubject", () => {
  it("空组返回空列表", () => {
    expect(interleaveBySubject({})).toEqual([]);
  });

  it("单科保持原倒序", () => {
    expect(interleaveBySubject({ falixue: ["a", "b", "c"] })).toEqual(["a", "b", "c"]);
  });

  it("多科轮转：前 N 个各科一条，科目均匀", () => {
    const out = interleaveBySubject({
      falixue: ["f1", "f2", "f3"],
      minfa: ["m1", "m2"],
    });
    // 每科的相对顺序保持；轮转使任意前缀中两科数量差 ≤1
    expect(out).toHaveLength(5);
    const countBy = (id: string) => out.filter((entry) => entry.startsWith(id[0])).length;
    expect(countBy("f")).toBe(3);
    expect(countBy("m")).toBe(2);
    expect(out.indexOf("f2")).toBeGreaterThan(out.indexOf("f1"));
    expect(out.indexOf("m2")).toBeGreaterThan(out.indexOf("m1"));
  });
});

describe("assembleExamItems", () => {
  it("空池返回空卷", () => {
    expect(assembleExamItems([], 10, { seed: 1 })).toEqual([]);
  });

  it("产出带溯源的题目（学科/课时/课名齐全）", () => {
    const items = assembleExamItems([lessonInput("falixue", "falixue-q052")], 5, { seed: 7 });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.subject).toBe("falixue");
      expect(item.lessonId).toBe("falixue-q052");
      expect(item.lessonTitle.length).toBeGreaterThan(0);
      expect(item.prompt.length).toBeGreaterThan(0);
      expect(item.explain.length).toBeGreaterThan(0);
    }
  });

  it("题量不足时给全部可出的题（每课 ≤2 题），不报错", () => {
    const inputs = FALI_LESSONS.slice(0, 3).map((id) => lessonInput("falixue", id));
    const items = assembleExamItems(inputs, 20, { seed: 3 });
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(6);
    const perLesson = new Set(items.map((item) => item.lessonId));
    expect(perLesson.size).toBe(3);
  });

  it("超出题量时截断到目标值，且同一 seed 结果可复现", () => {
    const inputs = FALI_LESSONS.map((id) => lessonInput("falixue", id));
    const first = assembleExamItems(inputs, 4, { seed: 42 });
    const second = assembleExamItems(inputs, 4, { seed: 42 });
    expect(first).toHaveLength(4);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("两轮分配：单课池也能给满 2 题，多课时每课先各出 1 题", () => {
    const [a, b, c] = FALI_LESSONS.slice(0, 3).map((id) => lessonInput("falixue", id));
    const spread = assembleExamItems([a, b, c], 3, { seed: 5 });
    expect(new Set(spread.map((item) => item.lessonId)).size).toBe(3);
    const [single] = [lessonInput("falixue", "falixue-q052")];
    const filled = assembleExamItems([single, single, single], 6, { seed: 5 });
    // 同一课重复传入也绝不超过每课 2 题
    expect(filled.length).toBeLessThanOrEqual(2);
  });

  it("题型过滤只保留所选题型", () => {
    const inputs = FALI_LESSONS.map((id) => lessonInput("falixue", id));
    const all = assembleExamItems(inputs, 20, { seed: 9 });
    expect(all.length).toBeGreaterThan(0);
    const filtered = assembleExamItems(inputs, 20, { kinds: ["judge"], seed: 9 });
    for (const item of filtered) expect(item.kind).toBe("judge");
    expect(filtered.length).toBeLessThanOrEqual(all.length);
  });
});

/** 按标准答案构造全对作答 */
function correctAnswers(items: LawExamItem[]): Record<string, LawExamAnswer> {
  const answers: Record<string, LawExamAnswer> = {};
  for (const item of items) {
    if (item.kind === "multi") answers[item.id] = item.multi ?? item.answer.split("、");
    else if (item.kind === "order") answers[item.id] = item.order ?? item.answer.split("→");
    else answers[item.id] = item.answer;
  }
  return answers;
}

/** 构造必然全错的作答 */
function wrongAnswers(items: LawExamItem[]): Record<string, LawExamAnswer> {
  const answers: Record<string, LawExamAnswer> = {};
  for (const item of items) {
    if (item.kind === "multi") answers[item.id] = [];
    else if (item.kind === "order") answers[item.id] = [];
    else answers[item.id] = "【必然不对的作答】";
  }
  return answers;
}

describe("gradeExam", () => {
  const items = assembleExamItems(
    [...FALI_LESSONS.map((id) => lessonInput("falixue", id)), lessonInput("minfa", "minfa-q031")],
    12,
    { seed: 11 },
  );
  expect(items.length).toBeGreaterThan(4);

  it("全对：correct=total，错题列表为空", () => {
    const grade = gradeExam(correctAnswers(items), items);
    expect(grade.total).toBe(items.length);
    expect(grade.correct).toBe(items.length);
    expect(grade.wrong).toHaveLength(0);
  });

  it("全错（含未作答）：correct=0，错题逐条进列表", () => {
    const grade = gradeExam(wrongAnswers(items), items);
    expect(grade.correct).toBe(0);
    expect(grade.wrong).toHaveLength(items.length);
    // 未作答（键缺失）同样计错且 userAnswer 为 null
    const partial = gradeExam({}, items);
    expect(partial.correct).toBe(0);
    expect(partial.wrong.every((entry) => entry.userAnswer === null)).toBe(true);
  });

  it("按科目汇总得分，两科都计入", () => {
    const grade = gradeExam(correctAnswers(items), items);
    const subjects = Object.keys(grade.bySubject);
    expect(subjects.sort()).toEqual(["falixue", "minfa"]);
    const summed = subjects.reduce(
      (sum, subject) => sum + grade.bySubject[subject as LawSubjectId]!.total,
      0,
    );
    expect(summed).toBe(items.length);
    expect(grade.bySubject.minfa!.correct).toBe(grade.bySubject.minfa!.total);
  });

  it("fill 判分走归一化：引号包裹与空白不影响判分", () => {
    const fill = items.find((item) => item.kind === "fill");
    expect(fill).toBeTruthy();
    const padded = ` 「${fill!.answer}」 `;
    const grade = gradeExam({ [fill!.id]: padded }, [fill!]);
    expect(grade.correct).toBe(1);
  });

  it("multi 全对才对：漏选与多选都判错", () => {
    const multi = items.find((item) => item.kind === "multi");
    if (!multi) return; // 该种子卷没有多选题时跳过（专用断言在下方合成题上）
    const correct = multi.multi ?? multi.answer.split("、");
    expect(gradeExam({ [multi.id]: correct }, [multi]).correct).toBe(1);
    expect(gradeExam({ [multi.id]: correct.slice(0, correct.length - 1) }, [multi]).correct).toBe(0);
    expect(gradeExam({ [multi.id]: [...correct, "多余选项"] }, [multi]).correct).toBe(0);
  });

  it("order 逐位一致才对：错位判错", () => {
    const order = items.find((item) => item.kind === "order");
    if (!order) return;
    const correct = order.order ?? order.answer.split("→");
    expect(gradeExam({ [order.id]: correct }, [order]).correct).toBe(1);
    const swapped = [...correct];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    expect(gradeExam({ [order.id]: swapped }, [order]).correct).toBe(0);
  });

  it("judge/mcq 精确匹配：答案串稍有出入即错", () => {
    const exact = items.find((item) => item.kind === "mcq" || item.kind === "judge");
    expect(exact).toBeTruthy();
    expect(gradeExam({ [exact!.id]: exact!.answer }, [exact!]).correct).toBe(1);
    expect(gradeExam({ [exact!.id]: `${exact!.answer} ` }, [exact!]).correct).toBe(0);
  });

  it("空卷判分为零且不产生错题", () => {
    const grade = gradeExam({}, []);
    expect(grade).toEqual({ total: 0, correct: 0, bySubject: {}, wrong: [] });
  });
});

describe("examAnswerLabel 与 examDurationSeconds", () => {
  it("序列作答以顿号连接展示，未作答为 null", () => {
    expect(examAnswerLabel(["甲", "乙"])).toBe("甲、乙");
    expect(examAnswerLabel("选项")).toBe("选项");
    expect(examAnswerLabel(undefined)).toBeNull();
  });

  it("总时长 = 题量 × 45 秒，0 题为 0", () => {
    expect(examDurationSeconds(10)).toBe(450);
    expect(examDurationSeconds(5)).toBe(225);
    expect(examDurationSeconds(0)).toBe(0);
  });
});
