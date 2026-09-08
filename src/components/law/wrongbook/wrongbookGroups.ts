import type { LawProgressMap } from "../../../lib/law-progress";
import { REVIEW_INTERVALS } from "../../../lib/law-progress";

/** 错题本条目：进度数据 + 展示口径，课名由页面层从目录补齐 */
export interface WrongItem {
  lessonId: string;
  wrongCount: number;
  wrongAt: number;
  reviewDueAt?: number;
  reviewStage: number;
  completedAt?: number;
}

export interface WrongbookGroups {
  /** 今天该测的（reviewDueAt 已过） */
  dueToday: WrongItem[];
  /** 还没到期的（按到期时间升序） */
  upcoming: WrongItem[];
  /** 毕业历史：答错过但五轮复习全过（reviewDueAt 已清空） */
  graduated: WrongItem[];
}

export function wrongTotalOf(groups: WrongbookGroups): number {
  return groups.dueToday.length + groups.upcoming.length + groups.graduated.length;
}

const DAY_MS = 86_400_000;

/** 把进度表折算成错题本三组（纯函数，无副作用；now 注入便于测试） */
export function groupWrongLessons(progress: LawProgressMap, now: number = Date.now()): WrongbookGroups {
  const dueToday: WrongItem[] = [];
  const upcoming: WrongItem[] = [];
  const graduated: WrongItem[] = [];
  for (const [lessonId, p] of Object.entries(progress)) {
    const wrongCount = p.wrongCount ?? 0;
    if (wrongCount <= 0) continue;
    const item: WrongItem = {
      lessonId,
      wrongCount,
      wrongAt: p.wrongAt ?? 0,
      reviewDueAt: p.reviewDueAt,
      reviewStage: p.reviewStage ?? 0,
      completedAt: p.completedAt,
    };
    if (p.reviewDueAt === undefined) {
      graduated.push(item);
    } else if (p.reviewDueAt <= now) {
      dueToday.push(item);
    } else {
      upcoming.push(item);
    }
  }
  dueToday.sort((a, b) => (a.reviewDueAt ?? 0) - (b.reviewDueAt ?? 0));
  upcoming.sort((a, b) => (a.reviewDueAt ?? 0) - (b.reviewDueAt ?? 0));
  graduated.sort((a, b) => b.wrongAt - a.wrongAt);
  return { dueToday, upcoming, graduated };
}

/** 到期状态的展示文案（"今天到期" / "3 天后" / 毕业话术） */
export function describeDue(
  item: { wrongCount: number; reviewDueAt?: number },
  now: number = Date.now(),
): string {
  if (item.reviewDueAt === undefined) {
    return `已毕业 · 五轮复习全过（错过 ${item.wrongCount} 次）`;
  }
  if (item.reviewDueAt <= now) return "今天到期";
  const days = Math.max(1, Math.ceil((item.reviewDueAt - now) / DAY_MS));
  return `${days} 天后到期`;
}

/** 复习阶段文案：第 N/5 轮（毕业的没有轮次） */
export function describeStage(item: { reviewStage?: number; reviewDueAt?: number }): string {
  if (item.reviewDueAt === undefined) return "";
  return `第 ${(item.reviewStage ?? 0) + 1}/${REVIEW_INTERVALS.length} 轮`;
}
