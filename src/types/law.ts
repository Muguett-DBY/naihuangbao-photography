/** 法硕考研学习中心 —— 数据类型契约 */

export type LawSubjectId = "falixue" | "xianfa" | "zhishixiang" | "minfa" | "xingfa";

export interface LawSubjectMeta {
  id: LawSubjectId;
  name: string;
  fullName: string;
  emoji: string;
  short: string;
  /** 主题强调色 */
  accent: string;
  accentSoft: string;
}

export type LawChapterLevel = "part" | "chapter" | "section" | "group";

export interface LawChapter {
  id: string;
  title: string;
  level: LawChapterLevel;
  lessons: LawLesson[];
}

export type LawStepKind =
  | "definition"
  | "list"
  | "compare"
  | "mnemonic"
  | "timeline"
  | "condition"
  | "exception"
  | "flow"
  | "plain";

export interface LawTerm {
  term: string;
  note?: string;
}

export interface LawStep {
  id: string;
  kind: LawStepKind;
  text: string;
  /** 列表 / 要件 / 流程 / 口诀逐项拆分 */
  parts?: string[];
  /** 关键词（讲解时着色 + 点击看解释） */
  terms?: LawTerm[];
  /** 口诀口诀内容 */
  mnemonic?: string;
  /** 时间线（timeline 步骤：时间点 → 说明） */
  timeline?: { when: string; what: string }[];
  /** 对比（compare 步骤：同点 / 异点行） */
  compare?: { same: string[]; diff: { label: string; a: string; b: string }[] };
  /** 转折（exception 步骤） */
  pivot?: { rule: string; except: string };
}

export type LawQuizKind = "fill" | "mcq" | "order" | "judge";

export interface LawQuizItem {
  id: string;
  kind: LawQuizKind;
  prompt: string;
  /** fill/mcq 选项 */
  options?: string[];
  answer: string;
  /** order 排序正确答案 */
  order?: string[];
  explain: string;
}

export interface LawLesson {
  id: string;
  subject: LawSubjectId;
  /** 书内序号（题号），如 "三十四" */
  code: string;
  /** 章节路径，如 ["刑法", "总则", "犯罪构成"] */
  breadcrumb: string[];
  title: string;
  intro: string;
  steps: LawStep[];
  mnemonic?: string;
  featured?: boolean;
  pageRange: number[];
  /** 原始 OCR 行（保底，绝不丢内容） */
  raw: string[];
  /** 自测题：运行时由 buildQuiz 生成，数据文件里不存储 */
  quiz?: LawQuizItem[];
}

export interface LawBook {
  id: LawSubjectId;
  name: string;
  fullName: string;
  emoji: string;
  accent: string;
  accentSoft: string;
  chapters: LawChapter[];
  lessonCount: number;
  /** 顶部未能归入章节的散页文字（保底保留） */
  leftover: string[];
}

/**
 * 术语/概念候选校验（数据与出题共用）：
 * 只接受"像概念名"的词：3-12 个汉字，无标点/数字残渣，不含题目型动词。
 */
export function isCleanTerm(term: string | null | undefined): boolean {
  if (!term) return false;
  const text = term.trim().replace(/^[（(【[]|[）)】\]]$/g, "").trim();
  if (text.length < 3 || text.length > 12) return false;
  if (!/^[\u4e00-\u9fa5]+$/.test(text)) return false;
  if (/[（(【[]\d|[0-9]{2,}/.test(text)) return false;
  if (/[。，；：、！？]/.test(text)) return false;
  if (/[简述论述简答分析评述试述说明讨论如何什么为什么哪些怎么谈谈]/.test(text)) return false;
  if (/^(的|了|是|在|与|和|或|对|从|把|被|并|而)/.test(text)) return false;
  return true;
}
