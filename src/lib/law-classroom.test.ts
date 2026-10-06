import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  convertToClassroom,
  extractTitle,
  generateScript,
  isClassroomCompatible,
  sceneTypeOf,
  type ClassroomLesson,
} from "./law-classroom";
import { isShellLesson, type LawBook, type LawLesson, type LawStep, type LawSubjectId } from "../types/law";

/**
 * 课堂场景转换层的内容完整性锁定：
 * 每一步的课本原文必须一字不差地进场景（含政治理论章节），绝不删减；
 * 类型推导与讲稿生成对全部五本书的每一节实质课都成立。
 */

const SUBJECTS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"] as const;

const books = Object.fromEntries(
  SUBJECTS.map((id) => [
    id,
    (JSON.parse(readFileSync(resolve(__dirname, "../data/law", `${id}.json`), "utf8")) as { book: LawBook }).book,
  ]),
) as Record<LawSubjectId, LawBook>;

/** 全部五本书的学习流实质课（非空壳、有可讲步骤） */
function substantiveLessons(): LawLesson[] {
  const lessons: LawLesson[] = [];
  for (const id of SUBJECTS) {
    for (const chapter of books[id].chapters) {
      if (chapter.appendix) continue;
      for (const lesson of chapter.lessons) {
        if (isShellLesson(lesson) || !isClassroomCompatible(lesson)) continue;
        lessons.push(lesson);
      }
    }
  }
  return lessons;
}

describe("law classroom conversion (content integrity)", () => {
  it("keeps every substantive step's full text verbatim in its scene (five books)", () => {
    let checked = 0;
    for (const lesson of substantiveLessons()) {
      const classroom = convertToClassroom(lesson);
      const scenesByStep = new Map(classroom.scenes.map((scene) => [scene.stepId, scene]));
      for (const step of lesson.steps) {
        if (step.text.trim().length < 4) continue; // 残步骤过滤是转换层的明示口径，原文仍在 lesson.raw
        const scene = scenesByStep.get(step.id);
        expect(scene, `${lesson.id}/${step.id} 必须有对应场景`).toBeDefined();
        // 课本原文一字不差上屏
        expect(scene!.content).toBe(step.text.trim());
        // 讲稿永远非空（TTS 有话可读）
        expect(scene!.teacherScript.length).toBeGreaterThan(0);
        checked += 1;
      }
      expect(classroom.totalScenes).toBe(classroom.scenes.length);
    }
    expect(checked).toBeGreaterThan(1000); // 全库 1500+ 实质步骤，测试没有空转
  });

  it("political-theory chapters (法理学) convert with full text, never dropped", () => {
    // 法理学的政治理论章节：法与政治 / 全面依法治国的一般原理 / 习近平法治思想
    const POLITICAL = /^(法与政治|全面依法治国的一般原理|习近平法治思想)$/;
    let chaptersSeen = 0;
    for (const chapter of books.falixue.chapters) {
      const name = (chapter.semanticTitle ?? chapter.title).trim();
      if (!POLITICAL.test(name)) continue;
      chaptersSeen += 1;
      for (const lesson of chapter.lessons) {
        if (isShellLesson(lesson) || !isClassroomCompatible(lesson)) continue;
        const classroom = convertToClassroom(lesson);
        const joined = classroom.scenes.map((scene) => scene.content).join("\n");
        for (const step of lesson.steps) {
          if (step.text.trim().length < 4) continue;
          expect(joined).toContain(step.text.trim());
        }
      }
    }
    expect(chaptersSeen).toBeGreaterThanOrEqual(3);
  });

  it("derives scene types from step kinds across the whole library", () => {
    for (const lesson of substantiveLessons()) {
      const classroom = convertToClassroom(lesson);
      for (const scene of classroom.scenes) {
        expect([
          "concept", "list", "compare", "checklist", "timeline", "alert", "flow", "mnemonic",
        ]).toContain(scene.type);
        // timeline 场景必有结构化时间线——缺数据的步已回退 concept，原文整段上屏
        if (scene.type === "timeline") {
          const step = lesson.steps.find((item) => item.id === scene.stepId);
          expect(step?.timeline?.length ?? 0).toBeGreaterThan(0);
        }
      }
    }
    // 仓库实况：全库 46 步 kind=timeline 全部没有结构化时间线（下方用例锁定它们全部回退
    // concept），所以这里不存在 timeline 场景；本分支是给"未来数据补齐时间线"的防护。
  });

  it("timeline-kind steps without timeline data downgrade to concept (full text on stage)", () => {
    // 全库有 46 步 kind=timeline 但没有结构化时间线（OCR 源未拆出）：
    // 空时间线舞台一个字不上屏，必须回退 concept 把原文完整呈现
    let downgraded = 0;
    for (const lesson of substantiveLessons()) {
      const classroom = convertToClassroom(lesson);
      for (const step of lesson.steps) {
        if (step.kind !== "timeline" || step.text.trim().length < 4) continue;
        if (step.timeline?.length) continue;
        const scene = classroom.scenes.find((item) => item.stepId === step.id);
        expect(scene, `${lesson.id}/${step.id}`).toBeDefined();
        expect(scene!.type).toBe("concept");
        expect(scene!.content).toBe(step.text.trim());
        downgraded += 1;
      }
    }
    expect(downgraded).toBeGreaterThan(40); // 仓库实况：46 步（防止口径悄悄变化）
  });

  it("appends exactly one quiz sentinel scene when lesson.quiz exists", () => {
    const lesson = substantiveLessons()[0];
    const withQuiz: LawLesson = {
      ...lesson,
      quiz: [
        { id: "z1", kind: "mcq", prompt: "测试题干", options: ["甲", "乙", "丙", "丁"], answer: "甲", explain: "解析" },
      ],
    };
    const plain = convertToClassroom(lesson);
    const classroom: ClassroomLesson = convertToClassroom(withQuiz);
    expect(classroom.scenes).toHaveLength(plain.scenes.length + 1);
    const quizScene = classroom.scenes.at(-1)!;
    expect(quizScene.stepId).toBe("quiz");
    expect(quizScene.type).toBe("quiz");
  });

  it("isClassroomCompatible rejects tour/shell-like lessons but accepts real ones", () => {
    const tours = substantiveLessons().length; // sanity
    expect(tours).toBeGreaterThan(0);
    // 导览课（无 4 字以上步骤）不能开课堂——课时页会回退步骤学习态
    const tourLike: LawLesson = {
      ...substantiveLessons()[0],
      steps: [{ id: "s0", kind: "plain", text: "导览" }],
      raw: [],
    };
    expect(isClassroomCompatible(tourLike)).toBe(false);
    expect(convertToClassroom(tourLike).scenes).toHaveLength(0);
  });

  it("extractTitle/generateScript stay deterministic and non-trivial on a sample", () => {
    const step: LawStep = {
      id: "s0",
      kind: "definition",
      text: "犯罪构成：刑法规定的，决定某种行为构成犯罪所必需的一切主观和客观要件的有机统一的整体。",
      terms: [{ term: "犯罪构成" }],
    };
    expect(extractTitle(step)).toBe("犯罪构成");
    const script = generateScript(step, sceneTypeOf(step));
    expect(script).toContain("犯罪构成");
    // 讲稿是纯函数：同输入同输出（Remotion 帧驱动确定性渲染依赖这一点）
    expect(generateScript(step, sceneTypeOf(step))).toBe(script);
  });
});
