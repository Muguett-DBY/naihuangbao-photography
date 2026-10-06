/**
 * 课堂场景转换层：把 lesson.steps（结构化课本步骤）自动转换为
 * 课堂播放用的 ClassroomScene[]（场景序列 + 奶黄包老师讲课稿 + 重点标注）。
 *
 * 设计理念（借鉴 OpenMAIC 的 Stage→Scene→Action 模式，独立实现）：
 * - 每个步骤变成一个 Scene：场景类型决定舞台渲染方式，讲稿驱动语音
 * - 播放引擎按序推进场景，画面与语音同步
 * - keyTerms 在"舞台"上聚光高亮，items 供 list/compare/checklist 逐条展开
 *
 * 讲稿原则：不改写课本内容，只把课本原文"变成说出来顺的话"——
 * 短句、口语连接词、温暖学姐语气（奶黄包人设）。
 * 步骤里的结构化数据（timeline/compare/pivot/mnemonic/parts）优先于裸文本：
 * 有结构就按结构讲（"第一…第二…""先…然后…"），没结构才整段照读；
 * 完整原文始终留在 scene.content 里上屏，朗读不逐字复读两遍。
 */
import type { LawLesson, LawStep, LawSubjectId, LawTerm } from "../types/law";
import { speak } from "./law-tts";

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
  | "quiz";      // 测验：嵌入练习（convertToClassroom 在 lesson.quiz 存在时追加）
  // "reading" 合并到 concept，不做区分

/** 单个课堂场景 */
export interface ClassroomScene {
  /** 场景序号（0-based） */
  index: number;
  /** 对应的原始步骤 id（进度追踪用；quiz 场景无原步骤，用 "quiz" 哨兵） */
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
  subject: LawSubjectId;
  title: string;
  breadcrumb: string[];
  scenes: ClassroomScene[];
  /** 课级口诀（如果有） */
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

/** 推导步骤的课堂场景类型（未知 kind 一律按 concept 讲） */
export function sceneTypeOf(step: LawStep): ClassroomSceneType {
  return KIND_TO_SCENE[step.kind] ?? "concept";
}

// ==================== 口语化辅助 ====================

/** 把课本文本整理成"适合读出来"的口语串：括号/项目符号变停顿，清掉多余标点 */
function toSpoken(text: string): string {
  return text
    .replace(/[※◆•·●○□■▶►]/g, "，")
    .replace(/[（(【\[［]/g, "，")
    .replace(/[）)】\]］]/g, "，")
    .replace(/\s+/g, "")
    .replace(/[，。；、！？]{2,}/g, "，")
    .replace(/^[，。；、！？：]+|[，。；、！？：]+$/g, "")
    .trim();
}

/** 步骤里的术语名（干净、非空） */
function termNames(terms?: LawTerm[]): string[] {
  return (terms ?? []).map((t) => t.term.trim()).filter(Boolean);
}

/** 口语化的口头序数：第一条、第二条……（超过十条退回数字） */
const CN_NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
function ordinal(i: number): string {
  return CN_NUM[i] ?? String(i + 1);
}

/** 关键词叮嘱尾句（最多点三个，避免变成报菜名） */
function termHint(step: LawStep): string {
  const names = termNames(step.terms).slice(0, 3);
  return names.length > 0 ? `记住这几个关键词：${names.join("、")}。` : "";
}

/**
 * 条目提取：优先用构建期拆好的 parts；
 * rough（OCR 残迹）不拆原文保底；没 parts 才按分号/句号切原文兜底。
 */
function listItemsOf(step: LawStep): string[] {
  if (step.parts?.length) {
    return step.parts.map((p) => p.trim()).filter((p) => p.length >= 2);
  }
  if (step.rough) return [];
  return toSpoken(step.text)
    .split(/[；;。]/)
    .map((s) => s.replace(/^[（(]?([一二三四五六七八九十]+|\d+)[）)、.．]/, "").trim())
    .filter((s) => s.length >= 4)
    .slice(0, 8);
}

/** 场景条目：compare 用对比行、timeline 用时间点，其余按 parts */
function sceneItems(step: LawStep, type: ClassroomSceneType): string[] {
  switch (type) {
    case "compare": {
      const c = step.compare;
      if (c?.diff.length) return c.diff.map((r) => `${r.label}：${r.a} ↔ ${r.b}`);
      return c?.same ?? [];
    }
    case "timeline":
      return (step.timeline ?? []).map((t) => `${t.when}：${t.what}`);
    default:
      return listItemsOf(step).slice(0, 8);
  }
}

// ==================== 标题提取 ====================

/** 从步骤文本提取简短标题（用作场景标题） */
export function extractTitle(step: LawStep): string {
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

// ==================== 老师讲课稿模板 ====================
/**
 * 每种场景类型一个讲稿模板（共 9 个）。
 * 奶黄包人设：温暖学姐，不是严肃教授。短句、口语连接词、有引导感。
 * 有结构（parts/timeline/compare/pivot/mnemonic）按结构讲，条目之间
 * 用"第一条/然后/接下来"这类口语铰链串起来；没结构才整段照读。
 */

const SCRIPT_BUILDERS: Record<ClassroomSceneType, (step: LawStep) => string> = {
  concept: (step) => {
    const lead = `来，我们先看这个概念。`;
    return `${lead}${toSpoken(step.text)} ${termHint(step)}`;
  },

  list: (step) => {
    const items = listItemsOf(step);
    if (items.length === 0) return `我们来梳理这一段的要点。${toSpoken(step.text)}`;
    const head = `这一段一共 ${items.length} 个要点，别急，我们一条一条过。`;
    const spoken = items
      .slice(0, 6)
      .map((item, i) => `第${ordinal(i)}条，${toSpoken(item)}`)
      .join("。");
    const tail =
      items.length > 6
        ? `剩下的 ${items.length - 6} 条，屏幕上都列出来了，课后扫一眼就好。`
        : `记住这 ${items.length} 条，这一段就把握住了。`;
    return `${head}${spoken}。${tail}${termHint(step)}`;
  },

  compare: (step) => {
    const head = `这两个概念最容易搞混，我们把它们放在一起对比，注意别记串了。`;
    const c = step.compare;
    if (!c) return `${head}${toSpoken(step.text)}`;
    const same = c.same.length > 0 ? `先说相同点：${c.same.map(toSpoken).join("；")}。` : "";
    const diff = c.diff
      .slice(0, 5)
      .map((r) => `${toSpoken(r.label)}，一个${toSpoken(r.a)}，另一个${toSpoken(r.b)}`)
      .join("；");
    const diffText = diff ? `不同的地方记住这句：${diff}。` : "";
    return `${head}${same}${diffText}`;
  },

  checklist: (step) => {
    const items = listItemsOf(step);
    const head = `这里是构成要件，一条都不能少，缺一个就不成立。`;
    if (items.length === 0) return `${head}${toSpoken(step.text)}`;
    const spoken = items
      .slice(0, 10)
      .map((item, i) => `第${ordinal(i)}项，${toSpoken(item)}`)
      .join("；");
    return `${head}一共 ${items.length} 项：${spoken}。对照着逐条检查。${termHint(step)}`;
  },

  timeline: (step) => {
    const tl = step.timeline ?? [];
    const head = `这部分按时间顺序理解最省力，我们顺着时间线走一遍。`;
    if (tl.length === 0) return `${head}${toSpoken(step.text)}`;
    const spoken = tl
      .map((t, i) => `${i === 0 ? "一开始" : "然后"}，${toSpoken(t.when)}，${toSpoken(t.what)}`)
      .join("；");
    return `${head}${spoken}。前后顺序记牢，考题最爱考先后。`;
  },

  alert: (step) => {
    const head = `划重点！这里有个例外，考试就爱在这里挖坑，打起精神。`;
    const p = step.pivot;
    if (p) {
      return `${head}一般规则是：${toSpoken(p.rule)}。但是，${toSpoken(p.except)}。这个反差一定要记牢。`;
    }
    return `${head}${toSpoken(step.text)} 遇到"但是""除外"这几个字，一定要圈出来。`;
  },

  flow: (step) => {
    const items = listItemsOf(step);
    const head = `这是一个流程，一步接一步，我们顺着走一遍。`;
    if (items.length === 0) return `${head}${toSpoken(step.text)}`;
    const spoken = items
      .slice(0, 10)
      .map((item, i) => `第${ordinal(i)}步，${toSpoken(item)}`)
      .join("；然后");
    return `${head}${spoken}。顺序不能乱。`;
  },

  mnemonic: (step) => {
    const rhyme = step.mnemonic?.trim();
    if (rhyme) {
      return `这段内容有点多，我给你编了个口诀，跟我念：${toSpoken(rhyme)}。多念两遍，考场上特别管用。`;
    }
    return `这段有个记忆窍门。${toSpoken(step.text)} 把关键词串起来记，效率高很多。`;
  },

  quiz: (step) => `最后趁热打铁，来做几道题检验一下。${toSpoken(step.text)} 别怕错，错了才知道哪里要补。`,
};

/**
 * 根据场景类型生成奶黄包的讲课稿。
 * 语气：温暖学姐，不是严肃教授。短句、口语化、有引导感。
 * 原则是"把课本原文变成说出来顺的话"，不是改写内容。
 */
export function generateScript(step: LawStep, type: ClassroomSceneType): string {
  return SCRIPT_BUILDERS[type](step)
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ==================== 核心转换函数 ====================

/** 把一个 LawLesson 转换为 ClassroomLesson（课堂播放数据） */
export function convertToClassroom(lesson: LawLesson): ClassroomLesson {
  // 过滤掉过短的残步骤（保底不丢实质内容）
  const validSteps = lesson.steps.filter((step) => step.text.trim().length >= 4);

  const scenes: ClassroomScene[] = validSteps.map((step, index) => {
    const type = sceneTypeOf(step);
    return {
      index,
      stepId: step.id,
      type,
      title: extractTitle(step),
      content: step.text.trim(),
      keyTerms: termNames(step.terms).slice(0, 6),
      items: sceneItems(step, type),
      teacherScript: generateScript(step, type),
      stepKind: step.kind,
    };
  });

  // 自测题运行时存在（buildQuiz 生成）时，追加一个 quiz 收尾场景
  if (lesson.quiz?.length) {
    const quiz = lesson.quiz;
    scenes.push({
      index: scenes.length,
      stepId: "quiz",
      type: "quiz",
      title: "随堂小测",
      content: `本课共 ${quiz.length} 道自测题，检验掌握程度`,
      keyTerms: [],
      items: quiz.slice(0, 8).map((q) => q.prompt),
      teacherScript: `本课就讲到这里，趁热打铁做 ${quiz.length} 道题检验一下。别怕错，错了才知道哪里要补。`,
      stepKind: "quiz",
    });
  }

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

// ==================== TTS 接口 ====================
/** 语音复用 law-tts（浏览器 SpeechSynthesis，自动选中文声线） */

export interface SpeakSceneOptions {
  /** 语速 0.5-2.0，默认 1.0 */
  rate?: number;
  /** 朗读结束回调 */
  onEnd?: () => void;
  /** 朗读出错回调 */
  onError?: () => void;
}

/** 朗读一个场景的讲课稿（奶黄包语音） */
export function speakScene(scene: ClassroomScene, options: SpeakSceneOptions = {}): void {
  speak(scene.teacherScript, options);
}
