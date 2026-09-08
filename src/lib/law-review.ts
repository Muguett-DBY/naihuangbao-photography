/**
 * T4 自适应复习算法（纯函数）：固定间隔 [1,2,4,7,15] 升级为"基础间隔 × 难度系数"。
 * - 难度系数由该课历史正确率（quizBest/quizTotal）与错误次数驱动，限定 [0.6, 1.8]：
 *   掌握好 → 系数大 → 间隔拉长（少复习）；常答错 → 系数小 → 间隔缩短（多复习）。
 * - 兼容语义：阶段数、毕业口径（五轮全过）与既有 reviewStage 完全一致；
 *   存量 reviewDueAt 不改写（下次事件才按新算法起算）→ 旧数据无损。
 */

/** 基础复习间隔（天）：答错后第 1/2/4/7/15 天，五次全对毕业 */
export const BASE_REVIEW_INTERVALS = [1, 2, 4, 7, 15];

const DAY_MS = 86_400_000;

export interface ReviewFactors {
  quizBest?: number;
  quizTotal?: number;
  wrongCount?: number;
}

/** 难度系数（好记性 1.8 / 常错 0.6）：正确率定基调，错误次数再压 */
export function reviewDifficulty(factors: ReviewFactors): number {
  let coeff = 1.0;
  const total = factors.quizTotal ?? 0;
  if (total > 0) {
    const accuracy = (factors.quizBest ?? 0) / total;
    if (accuracy >= 0.9) coeff += 0.5;
    else if (accuracy >= 0.75) coeff += 0.3;
    else if (accuracy >= 0.5) coeff += 0.1;
    else coeff -= 0.3;
  }
  const wrongs = factors.wrongCount ?? 0;
  if (wrongs >= 5) coeff -= 0.3;
  else if (wrongs >= 3) coeff -= 0.2;
  else if (wrongs >= 2) coeff -= 0.1;
  return Math.min(1.8, Math.max(0.6, coeff));
}

/** 下一轮复习到期时间：基础间隔 × 难度系数，四舍五入且至少 1 天 */
export function nextReviewDueAt(stage: number, factors: ReviewFactors, now: number): number {
  const base = BASE_REVIEW_INTERVALS[Math.min(Math.max(stage, 0), BASE_REVIEW_INTERVALS.length - 1)] ?? 1;
  const days = Math.max(1, Math.round(base * reviewDifficulty(factors)));
  return now + days * DAY_MS;
}

/** 记忆强度（1-3 星）：正确率主导，毕业满分——错题本"这课记得多牢"的展示口径 */
export function memoryStrength(progress: {
  quizBest?: number;
  quizTotal?: number;
  wrongCount?: number;
  reviewStage?: number;
  reviewDueAt?: number;
}): 1 | 2 | 3 {
  // 五轮全过毕业 = 已牢
  if ((progress.wrongCount ?? 0) > 0 && progress.reviewDueAt === undefined) {
    if ((progress.reviewStage ?? 0) >= BASE_REVIEW_INTERVALS.length) return 3;
  }
  const total = progress.quizTotal ?? 0;
  if (total <= 0) return 1;
  const accuracy = (progress.quizBest ?? 0) / total;
  if (accuracy >= 0.85) return 3;
  if (accuracy >= 0.6) return 2;
  return 1;
}

/** 星级展示文案（★☆☆/★★☆/★★★） */
export function strengthLabel(stars: 1 | 2 | 3): string {
  return stars === 3 ? "★★★" : stars === 2 ? "★★☆" : "★☆☆";
}
