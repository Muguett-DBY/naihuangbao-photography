/**
 * 课堂场景转换层：把现有的 lesson.steps（结构化步骤）自动转换为
 * 课堂播放用的 ClassroomScene[]（场景序列 + 老师讲课稿 + 重点标注）。
 *
 * 设计理念（借鉴 OpenMAIC 的 Stage→Scene→Action 模式）：
 * - 每个步骤变成一个 Scene，有明确的展示类型和老师讲稿
 * - 播放引擎按序推进场景，同步显示内容和语音
 * - 重点术语在"舞台"上聚光高亮
 *
 * 不依赖 OpenMAIC 源码——独立实现，适配我们已有的数据结构。
 */
import type { LawLesson, LawStep } from "../types/law";

// ==================== 类型定义 ====================

/** 课堂场景类型：决定舞台渲染方式 */
export type ClassroomSceneType =
  | "concept"    // 定义/细读：大标题 + 正文 + 重点词
  | "list"       // 列举：逐条展开
  | "compare"    // 对比：左右对照
  | "checklist"  // 要件：勾选清单
  | "timeline"   // 时间线：按时间排列
  | "alert"      // 例外/注意：高亮警示
  | "flow"       // 流程：顺序步骤
  | "mnemonic"   // 口诀：特殊记忆卡
  | "quiz";      // 测验：嵌入练习
  // "reading" 合并到 concept，不做区分

/** 单个课堂场景 */
export interface ClassroomScene {
  /** 场景序号（0-based） */
  index: number;
  /** 对应的原始步骤 id（进度追踪用） */
  stepId: string;
  /** 场景类型（决定渲染方式） */
  type: ClassroomSceneType;
  /** 场景标题（从步骤提取的短语） */
  title: string;
  /** 完整课本原文 */
  content: string;
  /** 重点术语（聚光高亮） */
  keyTerms: string[];
  /** 列举条目（list/compare/checklist 用） */
  items: string[];
  /** 奶黄包老师的讲课稿（TTS 朗读 + 气泡展示） */
  teacherScript: string;
  /** 步骤原始类型（保留上下文） */
  stepKind: string;
}

/** 一节课的完整课堂数据 */
export interface ClassroomLesson {
  lessonId: string;
  subject: string;
  title: string;
  breadcrumb: string[];
  scenes: ClassroomScene[];
  /** 口诀（如果有） */
  mnemonic?: string;
  /** 总场景数 */
  totalScenes: number;
}

// ==================== 场景类型推导 ====================

/** 步骤 kind → 课堂场景类型映射 */
const KIND_TO_SCENE: Record<string, ClassroomSceneType> = {
  definition: "concept",
  list: "list",
  compare: "compare",
  condition: "checklist",
  timeline: "timeline",
  exception: "alert",
  flow: "flow",
  mnemonic: "mnemonic",
  plain: "concept",
};

export function sceneTypeOf(step: LawStep): ClassroomSceneType {
  return KIND_TO_SCENE[step.kind] ?? "concept";
}

// ==================== 标题提取 ====================

/** 从步骤文本提取简短标题（用作场景标题） */
export function extractTitle(step: LawStep): string {
  // 优先从 text 开头提取
  const text = step.text.trim();
  // 匹配"（一）XXX"或"1.XXX"或"XXX："模式
  const patterns = [
    /^[（(]([一二三四五六七八九十]+)[）)]\s*(.{2,20})/,
    /^(\d+)[.．]\s*(.{2,20})/,
    /^(.{2,15})[：:]/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[m.length - 1].trim().slice(0, 20);
  }
  // 回退：用 terms 或前 12 字
  if (step.terms?.length) return step.terms[0].term;
  return text.slice(0, 12);
}

// ==================== 老师讲课稿生成 ====================

/**
 * 根据步骤类型生成奶黄包的讲课稿。
 * 语气：温暖学姐，不是严肃教授。短句、口语化、有引导感。
 * 原则是"把课本原文变成说出来顺的话"，不是改写内容。
 */
export function generateScript(step: LawStep, sceneType: ClassroomSceneType): string {
  const text = step.text.trim();
  const terms = step.terms?.map(t => t.term).filter(Boolean) ?? [];
  const termHint = terms.length > 0 ? `记住这几个关键词：${terms.slice(0, 3).join("、")}。` : "";

  switch (sceneType) {
    case "concept":
      return `我们来看这个概念。${text} ${termHint}`;

    case "list": {
      const items = step.parts ?? [];
      if (items.length > 0) {
        return `这里有 ${items.length} 个要点，我们一个一个来看。${text}`;
      }
      return `我们来梳理一下要点。${text}`;
    }

    case "compare":
      return `这两个概念容易搞混，我们来对比一下。${text} 注意它们的区别。`;

    case "checklist":
      return `这部分是构成要件，缺一个都不行。${text} ${termHint}`;

    case "timeline":
      return `我们按时间顺序来梳理。${text}`;

    case "alert":
      return `注意，这里有个重要的例外。${text} 这个考点经常出题。`;

    case "flow":
      return `我们来看这个流程，一步一步走。${text}`;

    case "mnemonic":
      return `这段有个口诀帮你记住。${text}`;

    default:
      return `${text} ${termHint}`;
  }
}

// ==================== 核心转换函数 ====================

/** 把一个 LawLesson 转换为 ClassroomLesson（课堂播放数据） */
export function convertToClassroom(lesson: LawLesson): ClassroomLesson {
  // 过滤掉空步骤和索引壳
  const validSteps = lesson.steps.filter(
    (step) => step.text.trim().length >= 4
  );

  const scenes: ClassroomScene[] = validSteps.map((step, index) => {
    const type = sceneTypeOf(step);
    const items = (step.parts ?? [])
      .map(p => p.trim())
      .filter(p => p.length >= 4)
      .slice(0, 8);

    return {
      index,
      stepId: step.id,
      type,
      title: extractTitle(step),
      content: step.text.trim(),
      keyTerms: (step.terms ?? []).map(t => t.term).filter(Boolean).slice(0, 6),
      items,
      teacherScript: generateScript(step, type),
      stepKind: step.kind,
    };
  });

  return {
    lessonId: lesson.id,
    subject: lesson.subject,
    title: lesson.title,
    breadcrumb: lesson.breadcrumb,
    scenes,
    mnemonic: lesson.mnemonic,
    totalScenes: scenes.length,
  };
}

/** 判断课时是否适合课堂模式（有实质内容的课都能用） */
export function isClassroomCompatible(lesson: LawLesson): boolean {
  return lesson.steps.some((step) => step.text.trim().length >= 4);
}
