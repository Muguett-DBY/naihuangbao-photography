/**
 * T5 干扰项质量库（运行时查询）：同章高频混淆对优先做干扰项。
 * 数据由 scripts/build-law-distractors.mjs 聚合生成（law:distractors），
 * 混淆命中只影响"优先顺序"——候选仍须通过既有全部闸门（同章、非子串、不在题面）。
 */
import { CONFUSION_PAIRS } from "./law-confusion-data";

/** 该术语的易混伙伴（按构建期相似度降序）；无则为空数组 */
export function confusablesOf(term: string): string[] {
  const raw = CONFUSION_PAIRS[term];
  return raw ? raw.split("|") : [];
}

/** 排序器：把池子里命中混淆对的候选排到前面（保持对内顺序，其余保持原序） */
export function preferConfusables<T extends string>(pool: T[], target: string): T[] {
  const preferred = confusablesOf(target);
  if (preferred.length === 0) return pool;
  const rank = new Map(preferred.map((term, index) => [term, index]));
  return [...pool].sort((a, b) => {
    const ra = rank.has(a) ? rank.get(a)! : pool.length;
    const rb = rank.has(b) ? rank.get(b)! : pool.length;
    return ra - rb;
  });
}
