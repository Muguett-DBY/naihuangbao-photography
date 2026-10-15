import { useSyncExternalStore, type CSSProperties, type FC } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type SpringConfig,
} from "remotion";
import type { ClassroomSceneType } from "../lib/law-classroom";
import type { LawSubjectId } from "../types/law";
import {
  C,
  CONTENT_WIDTH,
  F,
  RADIUS,
  SAFE,
  SPRING,
  STEP_TYPE_META,
  SUBJECT_ACCENTS,
  T,
  VIDEO,
  withAlpha,
} from "./theme";

/**
 * 课堂场景视觉底座（七种场景共用，Apple 黑白灰极简）：
 * - SceneChrome：顶部类型徽标（浅灰胶囊 + 单色几何符号 + 字重标签）+ 底部
 *   课程进度点（学科锚点实心/半透明分档——锚点仅用于进度这一处）
 * - 帧驱动动画 helpers：入场全部为 200-300ms ease-out（interpolate 线性缓出，
 *   无过冲无回弹），描边生长、序号淡入同节奏；无循环动画（可爱期的吉祥物
 *   贴纸浮动已随贴纸一起退役）；需随机感时用 pseudoRandom 的帧号种子
 * - StepMark：list/checklist/alert/quiz 条目前的图形化符号（✓ 描边 / ⚠ / ？）
 *   ——已拆至 step-mark.tsx（守本文件 500 行架构预算），动效仍回这里取 helpers
 *
 * 挂载约定：SceneChrome 是全画布叠加层，与带 sceneFrameStyle padding 的内容层
 * 同级摆放（内层 AbsoluteFill 是 absolute inset:0，塞进 padding 层里会把 SAFE
 * 坐标再叠一次偏移）。动效只落在入场时刻，入场后画面静止。
 */

// ==================== prefers-reduced-motion ====================

let reducedMotionQuery: MediaQueryList | null = null;

function getReducedMotionQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  reducedMotionQuery ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  return reducedMotionQuery;
}

/**
 * respects prefers-reduced-motion：系统声明"减少动态效果"时所有 helper 定格
 * 终态（ListScene.tsx 同款 useSyncExternalStore 模式）；渲染环境无 window 时
 * 返回 false，保证 Remotion 渲染管线按完整动画确定性出片。
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const query = getReducedMotionQuery();
      if (!query) return () => undefined;
      query.addEventListener("change", onStoreChange);
      return () => query.removeEventListener("change", onStoreChange);
    },
    () => getReducedMotionQuery()?.matches ?? false,
    () => false,
  );
}

// ==================== 帧驱动 helpers ====================

/** 帧号 → spring 进度，reduced 时定格终态（ConceptScene 同款约定），进度夹在 [0,1] */
export function useStageProgress(): (startFrame: number, config: SpringConfig) => number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = usePrefersReducedMotion();
  return (startFrame, config) => {
    if (reduced) return 1;
    return Math.min(1, Math.max(0, spring({ frame: frame - startFrame, fps, config })));
  };
}

/**
 * 确定性伪随机（禁 Math.random 的替代品）：FNV-1a 变体整数哈希 → [0,1)。
 * 同一组种子在任何机器、任何渲染顺序下得到同一列数，帧可复现；
 * 典型用法 pseudoRandom(frame, index) 给微小的错峰/偏移量。
 */
export function pseudoRandom(...seeds: readonly number[]): number {
  let hash = 2166136261 >>> 0;
  for (const seed of seeds) {
    hash ^= Math.imul(seed | 0, 0x9e3779b1) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 15), 2246822519) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 13), 3266489917) >>> 0;
    hash ^= hash >>> 16;
  }
  return (hash >>> 0) / 4294967296;
}

/** ease-out 缓出进度：帧区间 [start, start+duration] → [0,1]（两端 clamp） */
function easeOutProgress(
  frame: number,
  start: number,
  duration: number,
  reduced: boolean,
): number {
  if (reduced) return 1;
  return interpolate(frame, [start, start + Math.max(1, duration)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** 上浮入场返回值：progress 供追加自定义插值，其余三项直接铺进 style */
export interface RiseIn {
  progress: number;
  opacity: number;
  y: number;
  scale: number;
}

/**
 * 上浮入场（Apple 化，替代可爱期的 useQBounceIn）：interpolate 线性缓出
 * （Easing.out(cubic)），默认 8 帧 ≈ 267ms 落位，无过冲无回弹；上移 + 淡入 +
 * 轻微缩放归位。reduced 时全部为终态。
 */
export function useRiseIn(
  startFrame: number,
  options?: { durationFrames?: number; distance?: number; scaleFrom?: number },
): RiseIn {
  const frame = useCurrentFrame();
  const reduced = usePrefersReducedMotion();
  const progress = easeOutProgress(
    frame,
    startFrame,
    options?.durationFrames ?? 8,
    reduced,
  );
  const distance = options?.distance ?? 22;
  const scaleFrom = options?.scaleFrom ?? 0.97;
  return {
    progress,
    opacity: progress,
    y: (1 - progress) * distance,
    scale: scaleFrom + (1 - scaleFrom) * progress,
  };
}

/** 弹跳入场返回值：progress 供追加自定义插值，其余四项直接铺进 style */
export interface BounceIn {
  progress: number;
  opacity: number;
  y: number;
  scale: number;
}

/** spring 上浮入场（SPRING 恒为 damping≥28 + clamp，无过冲）；reduced 时全部为终态 */
export function useBounceIn(
  startFrame: number,
  options?: { config?: SpringConfig; distance?: number; scaleFrom?: number },
): BounceIn {
  const progress = useStageProgress()(
    startFrame,
    options?.config ?? SPRING.soft,
  );
  const distance = options?.distance ?? 36;
  const scaleFrom = options?.scaleFrom ?? 0.95;
  return {
    progress,
    opacity: progress,
    y: interpolate(progress, [0, 1], [distance, 0], { extrapolateRight: "clamp" }),
    scale: interpolate(progress, [0, 1], [scaleFrom, 1], { extrapolateRight: "clamp" }),
  };
}

/** 描边生长：0→1 的描边进度（spring 驱动）；reduced 时直接 1（一次画完） */
export function useStrokeProgress(startFrame: number, config: SpringConfig = SPRING.soft): number {
  return useStageProgress()(startFrame, config);
}

/** SVG 描边生长样式：进度 → dasharray/dashoffset（length 用 pathLength 归一化，免 DOM 测量） */
export function strokeDashStyle(progress: number, length = 100): CSSProperties {
  return {
    strokeDasharray: length,
    strokeDashoffset: length * (1 - Math.min(1, Math.max(0, progress))),
  };
}

/** 序号盖章返回值：scale/rotate 落 transform，opacity 单独给 */
export interface Stamp {
  opacity: number;
  scale: number;
  rotate: number;
}

/**
 * 序号落位（Apple 化）：默认 200ms ease-out 缩放归位 + 淡入，无砸落无回弹；
 * rotate 仅为 step-mark.tsx 的既有调用签名保留（同一缓出节奏内转正）。
 * reduced 时定格为 { 1, 1, 0 }。
 */
export function useStamp(
  startFrame: number,
  options?: { rotate?: number; scaleFrom?: number; durationFrames?: number },
): Stamp {
  const frame = useCurrentFrame();
  const reduced = usePrefersReducedMotion();
  const progress = easeOutProgress(frame, startFrame, options?.durationFrames ?? 6, reduced);
  const rotate = options?.rotate ?? 0;
  const scaleFrom = options?.scaleFrom ?? 0.9;
  return {
    opacity: progress,
    scale: scaleFrom + (1 - scaleFrom) * progress,
    rotate: (1 - progress) * rotate,
  };
}

// ==================== SceneChrome ====================

export interface SceneChromeProps {
  /** 场景类型：决定徽标几何符号与文案（theme.STEP_TYPE_META）；alert 徽标走语义红 */
  type: ClassroomSceneType;
  /** 学科：决定进度点锚点色（theme.SUBJECT_ACCENTS） */
  subject: LawSubjectId;
  /** 第几场（0-based） */
  index: number;
  /** 共几场 */
  total: number;
}

/** chrome 自己的节拍：徽标与场景标题同帧起跳（T.titleIn），进度点紧随其后 */
const CHROME_T = { badgeIn: T.titleIn, dotsIn: 2 } as const;

const DOT_MAX = 18; // 与 GraphicStage 的 18px 进度点同规格
const DOT_MIN = 8;

/**
 * SceneChrome — 单场场景的视觉底座叠加层（Apple 黑白灰）：
 * 顶部类型徽标（浅灰胶囊 + 单色几何符号 + ink 600 标签，200ms 缓出入场；
 * alert 类型徽标整体语义红）、底部课程进度点（当前=学科锚点实心放大、
 * 已过=锚点半透明、未来=发丝线空心——锚点只用在进度这一处）。
 * pointer-events 全关，绝不拦截播放器手势。
 */
export const SceneChrome: FC<SceneChromeProps> = ({ type, subject, index, total }) => {
  const frame = useCurrentFrame();
  const reduced = usePrefersReducedMotion();
  const meta = STEP_TYPE_META[type];
  /** 学科锚点：进度点专用（白底实测 5.02-6.04:1） */
  const anchor = SUBJECT_ACCENTS[subject].ink;
  /** 徽标色调：例外警示走语义红（红仅错误/警示），其余一律 ink 单色 */
  const badgeTone = type === "alert" ? C.err : C.ink;

  const badge = useRiseIn(CHROME_T.badgeIn, { distance: 16, durationFrames: 7 });
  const dotsIn = reduced
    ? 1
    : interpolate(frame, [CHROME_T.dotsIn, CHROME_T.dotsIn + 10], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  // 进度点自适应：总场次多时缩点径/间距，一行始终装进安全区内容宽（930px）
  const count = Math.max(0, Math.floor(total));
  const gap = count > 24 ? 6 : 8;
  const dotSize =
    count === 0
      ? 0
      : Math.max(
          DOT_MIN,
          Math.min(DOT_MAX, Math.floor((CONTENT_WIDTH - gap * (count - 1)) / count)),
        );
  const currentIndex = Math.min(Math.max(Math.floor(index), 0), Math.max(0, count - 1));

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* 顶部场景类型徽标：浅灰胶囊 + 单色几何符号 + ink 600 标签（层级靠字重） */}
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: SAFE.top,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 28px",
          borderRadius: RADIUS.pill,
          backgroundColor: C.paper,
          fontFamily: F.heading,
          opacity: badge.opacity,
          transform: `translateY(${badge.y}px)`,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1, color: badgeTone }}>
          {meta.icon}
        </span>
        <span
          style={{
            fontSize: 28,
            lineHeight: 1,
            letterSpacing: "0.14em",
            fontWeight: 600,
            color: badgeTone,
          }}
        >
          {meta.scene}
        </span>
      </div>

      {/* 底部课程进度点：当前=锚点实心 1.35 倍 · 已过=锚点 45% · 未来=发丝线空心 */}
      {count > 0 && (
        <div
          style={{
            position: "absolute",
            left: SAFE.left,
            width: CONTENT_WIDTH,
            bottom: VIDEO.height - SAFE.bottom + 34,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap,
            opacity: dotsIn,
          }}
        >
          {Array.from({ length: count }, (_, dot) => {
            const isDone = dot < currentIndex;
            const isCurrent = dot === currentIndex;
            return (
              <div
                key={dot}
                style={{
                  flex: "none",
                  width: dotSize,
                  height: dotSize,
                  borderRadius: "50%",
                  backgroundColor: isCurrent
                    ? anchor
                    : isDone
                      ? withAlpha(anchor, 0.45)
                      : "transparent",
                  border: isCurrent
                    ? "none"
                    : `2px solid ${isDone ? withAlpha(anchor, 0.45) : C.line}`,
                  transform: isCurrent ? "scale(1.35)" : undefined,
                }}
              />
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};
