import type { EggTrigger } from "./law-progress";

/** 彩蛋判定的纯函数上下文：全部输入可注入，便于用假时间/假进度做全覆盖测试 */
export interface EggCheckContext {
  now: Date;
  /** 已掌握课时数 */
  doneCount: number;
  /** 连续学习天数 */
  streakDays: number;
  /** 错题本课数 */
  wrongLessons: number;
  /** 距考试天数 */
  daysLeft: number;
  /** 已解锁过的彩蛋（一次性） */
  unlocked: Partial<Record<EggTrigger, boolean>>;
  /** 已从错题本毕业的课时数（≥1 解锁「错题毕业礼」） */
  graduatedWrongCount?: number;
  graduatedWrongCount3?: boolean;
  /** 当前这本书的学习流进度已过半（done×2 ≥ total） */
  pathHalfDone?: boolean;
  /** 当前这本书的学习流已全部完成 */
  bookAllDone?: boolean;
}

const isUnlocked = (ctx: EggCheckContext, trigger: EggTrigger) => ctx.unlocked[trigger] === true;

/**
 * 时间/里程碑彩蛋判定（按优先级取第一个可触发的）。
 * 与 UI 解耦：只读上下文，不碰 localStorage / Date.now。
 */
export function checkEasterEggPure(ctx: EggCheckContext): EggTrigger | null {
  const hour = ctx.now.getHours();
  const month = ctx.now.getMonth() + 1;
  const day = ctx.now.getDate();

  // 日期型（优先级最高）
  if (month === 12 && day === 25 && !isUnlocked(ctx, "christmas")) return "christmas";
  if ((hour >= 23 || hour < 5) && !isUnlocked(ctx, "midnight")) return "midnight";
  if (hour >= 5 && hour < 9 && !isUnlocked(ctx, "morning")) return "morning";
  if (ctx.daysLeft <= 30 && !isUnlocked(ctx, "exam30")) return "exam30";
  // 里程碑型（越靠后越稀有）
  if (ctx.doneCount === 1 && !isUnlocked(ctx, "firstLesson")) return "firstLesson";
  if (ctx.doneCount >= 100 && !isUnlocked(ctx, "hundred")) return "hundred";
  if (ctx.streakDays >= 3 && !isUnlocked(ctx, "streak3")) return "streak3";
  if (ctx.streakDays >= 7 && !isUnlocked(ctx, "streak7")) return "streak7";
  if (ctx.wrongLessons >= 3 && !isUnlocked(ctx, "wrongbook3")) return "wrongbook3";
  if ((ctx.graduatedWrongCount ?? 0) >= 1 && !isUnlocked(ctx, "wrongGraduate")) return "wrongGraduate";
  // 全书通比过半更稀有：同页两枚都达成时先庆大的
  if (ctx.bookAllDone && !isUnlocked(ctx, "bookDone")) return "bookDone";
  if (ctx.pathHalfDone && !isUnlocked(ctx, "pathHalf")) return "pathHalf";
  // P1/S5 新增里程碑
  return null;
}
