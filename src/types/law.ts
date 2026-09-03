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
