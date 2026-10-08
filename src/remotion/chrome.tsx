import { useSyncExternalStore, type CSSProperties, type FC } from "react";
import {
  AbsoluteFill,
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
  SAFE,
  SPRING,
  STEP_TYPE_META,
  SUBJECT_ACCENTS,
  T,
  VIDEO,
  withAlpha,
} from "./theme";

/**
 * 课堂场景视觉底座（七种场景共用）：
 * - SceneChrome：顶部类型徽标 + 底部课程进度点 + 学科色角落淡晕（纯叠加层，不碰内容）
 * - 帧驱动动画 helpers：弹跳入场 / 描边生长 / 序号盖章（全部 useCurrentFrame +
 *   interpolate/spring，确定性渲染；需随机感时用 pseudoRandom 的帧号种子）
 * - StepMark：list/checklist/alert/quiz 条目前的图形化符号（✓ 描边 / ⚠ / ？徽章）
 *
 * 挂载约定：SceneChrome 是全画布叠加层，与带 sceneFrameStyle padding 的内容层
 * 同级摆放（内层 AbsoluteFill 是 absolute inset:0，塞进 padding 层里会把 SAFE
 * 坐标再叠一次偏移）。动效只在入场时刻发生，之后保持静止。
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

/** 弹跳入场返回值：progress 供追加自定义插值，其余四项直接铺进 style */
export interface BounceIn {
  progress: number;
  opacity: number;
  y: number;
  scale: number;
}

/** 弹跳入场：spring 上浮 + 淡入 + 轻缩放归位；reduced 时全部为终态 */
export function useBounceIn(
  startFrame: number,
  options?: { config?: SpringConfig; distance?: number; scaleFrom?: number },
): BounceIn {
  const progress = useStageProgress()(
    startFrame,
    options?.config ?? SPRING.soft,
  );
  const distance = options?.distance ?? 36;
  const scaleFrom = options?.scaleFrom ?? 0.92;
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
 * 序号盖章：大→小砸落归位 + 起始微倾转正（贴纸/印章手感，SPRING.term 的脆弹）。
 * reduced 时定格为 { 1, 1, 0 }。
 */
export function useStamp(
  startFrame: number,
  options?: { rotate?: number; scaleFrom?: number },
): Stamp {
  const progress = useStageProgress()(startFrame, SPRING.term);
  const rotate = options?.rotate ?? -6;
  const scaleFrom = options?.scaleFrom ?? 1.6;
  return {
    opacity: progress,
    scale: interpolate(progress, [0, 1], [scaleFrom, 1], { extrapolateRight: "clamp" }),
    rotate: interpolate(progress, [0, 1], [rotate, 0], { extrapolateRight: "clamp" }),
  };
}

// ==================== StepMark：条目图形化符号 ====================

export type StepMarkKind = "checklist" | "alert" | "quiz";

/**
 * 条目前的 SVG 符号（升级清单：checklist ✓ 描边生长 / alert ⚠ / quiz ？徽章，
 * 替代纯数字圆点）。全部走本文件的帧驱动 helpers，reduced 时定格终态。
 */
export const StepMark: FC<{
  kind: StepMarkKind;
  accent: string;
  /** 入场起跳帧（场景局部帧号） */
  enterAt?: number;
  /** 渲染尺寸（正方形边长，px） */
  size?: number;
}> = ({ kind, accent, enterAt = 0, size = 44 }) => {
  const check = useStrokeProgress(enterAt + 6, SPRING.term);
  const alert = useBounceIn(enterAt, { distance: 20, scaleFrom: 0.8 });
  const quiz = useStamp(enterAt, { rotate: 8, scaleFrom: 1.5 });

  const shared: CSSProperties = { flex: "none", width: size, height: size };

  if (kind === "checklist") {
    return (
      <svg viewBox="0 0 34 34" style={shared} aria-hidden="true">
        <rect
          x={3}
          y={3}
          width={28}
          height={28}
          rx={9}
          fill={withAlpha(accent, 0.1)}
          stroke={withAlpha(accent, 0.45)}
          strokeWidth={2.5}
        />
        <path
          d="M10 17.5 L15 22.5 L24.5 11.5"
          fill="none"
          stroke={accent}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={100}
          style={strokeDashStyle(check)}
        />
      </svg>
    );
  }

  if (kind === "alert") {
    return (
      <svg
        viewBox="0 0 34 34"
        style={{
          ...shared,
          opacity: alert.opacity,
          transform: `translateY(${alert.y}px) scale(${alert.scale})`,
        }}
        aria-hidden="true"
      >
        <path
          d="M17 4.5 L31.5 29 H2.5 Z"
          fill={withAlpha(accent, 0.12)}
          stroke={accent}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <path
          d="M17 13 V20.5"
          stroke={accent}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        <circle cx={17} cy={25} r={1.9} fill={accent} />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 34 34"
      style={{
        ...shared,
        opacity: quiz.opacity,
        transform: `scale(${quiz.scale}) rotate(${quiz.rotate}deg)`,
      }}
      aria-hidden="true"
    >
      <circle
        cx={17}
        cy={17}
        r={14}
        fill={withAlpha(accent, 0.14)}
        stroke={withAlpha(accent, 0.45)}
        strokeWidth={2.5}
      />
      <text
        x={17}
        y={23}
        textAnchor="middle"
        fontFamily={F.zhSans}
        fontSize={19}
        fontWeight={700}
        fill={accent}
      >
        ？
      </text>
    </svg>
  );
};

// ==================== SceneChrome ====================

export interface SceneChromeProps {
  /** 场景类型：决定徽标图标与文案（theme.STEP_TYPE_META） */
  type: ClassroomSceneType;
  /** 学科：决定淡晕与进度点的学科色（theme.SUBJECT_ACCENTS） */
  subject: LawSubjectId;
  /** 覆盖强调色（例外等特殊场用 theme.C.err 压过学科色）；缺省取学科 accent */
  accent?: string;
  /** 第几场（0-based） */
  index: number;
  /** 共几场 */
  total: number;
}

/** chrome 自己的节拍：徽标与场景标题同帧起跳（T.titleIn），其余紧随其后 */
const CHROME_T = { badgeIn: T.titleIn, dotsIn: 2, stampIn: 10, washIn: 15 } as const;

const DOT_MAX = 18; // 与 GraphicStage 的 18px 进度点同规格
const DOT_MIN = 8;

/**
 * SceneChrome — 单场场景的视觉底座叠加层：
 * 顶部类型徽标（bounce 入场）、底部课程进度点（第 M/共 N 场，已过实心、
 * 当前盖章放大、未来空心圈，样式照搬 GraphicStage 的 dots）、学科色角落淡晕
 * （入场淡入一次后静止）。pointer-events 全关，绝不拦截播放器手势。
 */
export const SceneChrome: FC<SceneChromeProps> = ({
  type,
  subject,
  accent,
  index,
  total,
}) => {
  const frame = useCurrentFrame();
  const reduced = usePrefersReducedMotion();
  const meta = STEP_TYPE_META[type];
  const tone = accent ?? SUBJECT_ACCENTS[subject].accent;

  const badge = useBounceIn(CHROME_T.badgeIn);
  const stamp = useStamp(CHROME_T.stampIn, { rotate: 0, scaleFrom: 1.6 });

  // 淡晕/进度点整行只做一次入场淡入，之后静止（动效只落在入场时刻）
  const wash = reduced
    ? 1
    : interpolate(frame, [0, CHROME_T.washIn], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
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
      {/* 学科色角落淡晕：右上角一处足矣，subtle wash 不抢内容 */}
      <AbsoluteFill
        style={{
          opacity: wash,
          background: `radial-gradient(920px 640px at 90% 2%, ${withAlpha(tone, 0.13)}, transparent 68%)`,
        }}
      />

      {/* 顶部场景类型徽标：类型图标 + 中文标签 */}
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: SAFE.top,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 28px",
          borderRadius: 999,
          border: `2px solid ${withAlpha(tone, 0.35)}`,
          backgroundColor: withAlpha(tone, 0.1),
          fontFamily: F.zhSans,
          opacity: badge.opacity,
          transform: `translateY(${badge.y}px) scale(${badge.scale})`,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 34, lineHeight: 1 }}>
          {meta.icon}
        </span>
        <span style={{ fontSize: 30, lineHeight: 1, letterSpacing: "0.14em", color: C.ink }}>
          {meta.scene}
        </span>
      </div>

      {/* 底部课程进度点：已过实心（65% 学科色）· 当前盖章放大 1.35 · 未来空心圈 */}
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
                    ? tone
                    : isDone
                      ? withAlpha(tone, 0.65)
                      : "transparent",
                  border: isCurrent || isDone ? "none" : `2px solid ${withAlpha(tone, 0.35)}`,
                  transform: isCurrent ? `scale(${stamp.scale * 1.35})` : undefined,
                }}
              />
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};
