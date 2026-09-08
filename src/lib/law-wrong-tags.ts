/**
 * 错因标签体系：每道错题按"题型 + 错误模式"打标，为复习提供"错在哪"。
 * 标签语义（四主类 + 顺序类）：
 * - 概念混淆：选择题/填空/判断术语变异里认错、选错概念
 * - 数字记错：判断题的年份/汉字数字变异没识破
 * - 人物错配：换的人物/人物型词条没识破（法制史高发）
 * - 条件遗漏：多选题漏选/多选（列举条件没记全）
 * - 顺序错乱：排序题顺序不对
 */
import type { LawQuizKind, LawQuizTrap } from "../types/law";
import { looksLikePerson } from "./law-quiz-mutate";

export type LawWrongTag = "概念混淆" | "数字记错" | "人物错配" | "条件遗漏" | "顺序错乱";

/** 一道错题的作答上下文（QuizRunner 收集，recordQuiz 聚合） */
export interface QuizWrongDetail {
  kind: LawQuizKind;
  /** judge 的变异手段（生成侧携带） */
  trap?: LawQuizTrap;
  /** 用户实际选/输入的内容 */
  picked?: string;
  answer?: string;
}

/** 单题错因推导（纯函数） */
export function deriveWrongTag(detail: QuizWrongDetail): LawWrongTag {
  if (detail.kind === "judge" && (detail.trap === "number" || detail.trap === "cn-number")) return "数字记错";
  if (detail.kind === "multi") return "条件遗漏";
  if (detail.kind === "order") return "顺序错乱";
  // 人物型词条没认出（判断换人名 / 选择里的人物干扰项 / 填空人物术语）
  if (detail.trap === "person") return "人物错配";
  if (looksLikePerson(detail.answer ?? "") || looksLikePerson(detail.picked ?? "")) return "人物错配";
  return "概念混淆";
}

/** 把一组错题明细聚合成标签计数（WrongItem.wrongTags 的口径） */
export function tallyWrongTags(details: QuizWrongDetail[]): Partial<Record<LawWrongTag, number>> {
  const tally: Partial<Record<LawWrongTag, number>> = {};
  for (const detail of details) {
    const tag = deriveWrongTag(detail);
    tally[tag] = (tally[tag] ?? 0) + 1;
  }
  return tally;
}

/** 展示用：按计数降序取前 N 个标签 */
export function topWrongTags(tags: Partial<Record<LawWrongTag, number>> | undefined, limit = 2): LawWrongTag[] {
  if (!tags) return [];
  return Object.entries(tags)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, limit)
    .map(([tag]) => tag as LawWrongTag);
}
