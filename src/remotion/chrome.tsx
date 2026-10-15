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
  RADIUS,
  SAFE,
  SHADOW,
  SPRING,
  STEP_TYPE_META,
  SUBJECT_ACCENTS,
  T,
  VIDEO,
  withAlpha,
} from "./theme";

/**
 * 课堂场景视觉底座（七种场景共用，可爱化：奶油底 + 粉彩 + 吉祥物）：
 * - SceneChrome：顶部类型徽标（粉彩胶囊 + 文楷 + 软阴影）+ 底部课程进度点
 *   （粉彩描边）+ 学科粉彩角落淡晕 + 右上奶黄包贴纸（纯叠加层，不碰内容）
 * - 帧驱动动画 helpers：弹跳入场 / Q 弹入场 / 描边生长 / 序号盖章 / 贴纸浮动
 *   （全部 useCurrentFrame + interpolate/spring，确定性渲染；需随机感时用
 *   pseudoRandom 的帧号种子）
 * - StepMark：list/checklist/alert/quiz 条目前的图形化符号（✓ 描边 / ⚠ / ？徽章）
 *   ——已拆至 step-mark.tsx（守本文件 500 行架构预算），动效仍回这里取 helpers
 *
 * 挂载约定：SceneChrome 是全画布叠加层，与带 sceneFrameStyle padding 的内容层
 * 同级摆放（内层 AbsoluteFill 是 absolute inset:0，塞进 padding 层里会把 SAFE
 * 坐标再叠一次偏移）。动效只落在入场时刻（吉祥物贴纸浮动是可爱令牌明示的
 * 唯一持续动效例外，≤6px、reduced 停）。
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

/** Q 弹入场返回值：progress 夹 [0,1]；y/scale 允许轻微过冲（过头再回正） */
export interface QBounceIn {
  progress: number;
  opacity: number;
  y: number;
  scale: number;
}

/**
 * Q 弹入场（可爱令牌）：SPRING.bouncy（ζ≈0.47）的 spring 值不夹顶，
 * y/scale 线性外推出可见过冲——上浮越过落点再回正、缩放弹过 1 再收回，
 * 过冲幅度显式封顶（y ≤ overshootPx=6px、scale ≤ +6%），永不糊脸。
 * 与 useBounceIn（进度夹 [0,1]、无过冲，供场景内容稳定排版）互补。
 * reduced 时定格终态。
 */
export function useQBounceIn(
  startFrame: number,
  options?: {
    config?: SpringConfig;
    distance?: number;
    scaleFrom?: number;
    overshootPx?: number;
  },
): QBounceIn {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = usePrefersReducedMotion();
  const config = options?.config ?? SPRING.bouncy;
  const distance = options?.distance ?? 30;
  const scaleFrom = options?.scaleFrom ?? 0.86;
  const overshootPx = Math.min(6, Math.max(0, options?.overshootPx ?? 6));
  if (reduced) return { progress: 1, opacity: 1, y: 0, scale: 1 };
  const value = spring({ frame: frame - startFrame, fps, config });
  const progress = Math.min(1, Math.max(0, value));
  const overshoot = Math.max(0, value - 1);
  return {
    progress,
    opacity: progress,
    y: Math.max(-overshootPx, (1 - value) * distance),
    scale: 1 + Math.min(0.06, overshoot * (1 - scaleFrom) * 2),
  };
}

/**
 * 贴纸浮动（吉祥物专用例外）：正弦上下浮动，帧驱动（useCurrentFrame，
 * 禁 CSS/库动画——animations.md），幅度硬封顶 ≤6px；reduced-motion 定格 0。
 * 这是全片唯一允许的持续动效：可爱令牌明示「吉祥物可帧驱动轻微浮动 ≤6px，
 * reduced 停」，其余装饰仍只做一次性入场。
 */
export function useStickerFloat(options?: {
  amplitude?: number;
  periodFrames?: number;
  phase?: number;
}): number {
  const frame = useCurrentFrame();
  const reduced = usePrefersReducedMotion();
  const amplitude = Math.min(6, Math.max(0, options?.amplitude ?? 4));
  const period = Math.max(30, options?.periodFrames ?? 90);
  const phase = options?.phase ?? 0;
  if (reduced) return 0;
  const t = ((((frame + phase) % period) + period) % period) / period; // [0, 1)
  return amplitude * Math.sin(t * Math.PI * 2);
}

/**
 * 吉祥物贴纸：奶黄包（LawMascot 的 idle 静态形态逐字移植——Remotion 内禁
 * framer-motion/CSS 动画，浮动改由 useStickerFloat 帧驱动）。Q 弹入场
 * （useQBounceIn）后轻微浮动；halo 为奶黄光晕底（C.custard 低透明度，纯装饰）。
 */
export const MascotSticker: FC<{
  /** 渲染尺寸（正方形边长，px；页面对齐 --law-mascot-sm 44 起步） */
  size?: number;
  /** 入场起跳帧（场景局部帧号） */
  enterAt?: number;
  /** 奶黄光晕底（默认开） */
  halo?: boolean;
  /** 入场后是否轻微浮动（默认开；reduced-motion 由 helper 内部定格） */
  float?: boolean;
}> = ({ size = 56, enterAt = 12, halo = true, float = true }) => {
  const pop = useQBounceIn(enterAt, { distance: 24, scaleFrom: 0.7, overshootPx: 6 });
  const bob = useStickerFloat({ amplitude: 5, periodFrames: 96 });
  const drift = float ? bob : 0;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        opacity: pop.opacity,
        transform: `translateY(${pop.y + drift}px) scale(${pop.scale})`,
      }}
      aria-hidden="true"
    >
      {halo && (
        <div
          style={{
            position: "absolute",
            inset: -size * 0.12,
            borderRadius: "50%",
            backgroundColor: withAlpha(C.custard, 0.28),
          }}
        />
      )}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ position: "relative", display: "block" }}
      >
        {/* 耳朵 */}
        <ellipse cx={24} cy={26} rx={10} ry={14} fill="#f2c9a0" transform="rotate(-18 24 26)" />
        <ellipse cx={76} cy={26} rx={10} ry={14} fill="#f2c9a0" transform="rotate(18 76 26)" />
        {/* 脸 */}
        <ellipse cx={50} cy={56} rx={42} ry={38} fill="#ffdfb3" />
        <ellipse cx={50} cy={70} rx={20} ry={12} fill="#ffe9cb" />
        {/* 眼睛（idle 静态形态） */}
        <circle cx={34} cy={46} r={5.2} fill="#5e3a28" />
        <circle cx={66} cy={46} r={5.2} fill="#5e3a28" />
        <circle cx={36} cy={44} r={1.8} fill="#fff" />
        <circle cx={68} cy={44} r={1.8} fill="#fff" />
        {/* 嘴 */}
        <path
          d="M38 62 q12 12 24 0"
          stroke="#8a4b34"
          strokeWidth={4.6}
          fill="none"
          strokeLinecap="round"
        />
        {/* 腮红 */}
        <ellipse cx={22} cy={58} rx={7} ry={4.6} fill="#f6a98c" opacity={0.75} />
        <ellipse cx={78} cy={58} rx={7} ry={4.6} fill="#f6a98c" opacity={0.75} />
      </svg>
    </div>
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
 * SceneChrome — 单场场景的视觉底座叠加层（可爱化）：
 * 顶部类型徽标（粉彩胶囊 + ink 文楷标签 + 软阴影，Q 弹 bounce 入场）、
 * 底部课程进度点（当前 ink 实心盖章放大、已过粉彩芯 + ink 描边、未来 ink
 * 细描边空心）、学科粉彩角落淡晕（粉彩高透明度铺色，比旧 ink 淡晕更奶油）、
 * 右上奶黄包贴纸（顶部 chrome 带内，不与安全区内容打架；入场后轻微浮动）。
 * pointer-events 全关，绝不拦截播放器手势。
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
  const tints = SUBJECT_ACCENTS[subject];
  /** 强调墨：文字/实心元素的承载色（对比度红线，双底 ≥5.54:1）；alert 覆盖时为 C.err */
  const inkTone = accent ?? tints.ink;
  /** 粉彩：底色块/淡晕/描边的装饰层。accent 恰为学科 ink（课堂层标准接线）时
   *  直接用学科粉彩 token（与页面外壳 SUBJECT_TINT 同值）；无粉彩变体的覆盖色
   *  （如 alert 的 C.err）才走低透明度自混——口径与 GraphicScene 一致 */
  const pastel =
    !accent || accent === tints.accent ? tints.pastel : withAlpha(accent, 0.16);
  /** 淡晕铺色：学科粉彩高透明度（token 路径）；覆盖色自混时压到 0.14 防抢内容 */
  const washColor =
    !accent || accent === tints.accent ? withAlpha(tints.pastel, 0.55) : withAlpha(accent, 0.14);

  const badge = useQBounceIn(CHROME_T.badgeIn);
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
      {/* 学科粉彩角落淡晕：右上角一处足矣，粉彩高透明度铺出奶油感，不抢内容 */}
      <AbsoluteFill
        style={{
          opacity: wash,
          background: `radial-gradient(960px 660px at 92% 0%, ${washColor}, transparent 70%)`,
        }}
      />

      {/* 顶部场景类型徽标：粉彩胶囊 + 文楷标签 + 软阴影（可爱令牌） */}
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: SAFE.top,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 30px",
          borderRadius: RADIUS.pill,
          border: `2.5px solid ${withAlpha(inkTone, 0.18)}`,
          backgroundColor: pastel,
          boxShadow: SHADOW.soft,
          fontFamily: F.heading,
          opacity: badge.opacity,
          transform: `translateY(${badge.y}px) scale(${badge.scale})`,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 34, lineHeight: 1 }}>
          {meta.icon}
        </span>
        {/* 标签用 ink 承载（对比度红线）：学科 ink 对粉彩底 ≥5.54:1；
            覆盖色路径（C.err 4.0:1 < 4.5）回落全局暖墨 */}
        <span
          style={{
            fontSize: 30,
            lineHeight: 1,
            letterSpacing: "0.14em",
            color: accent ? C.ink : inkTone,
          }}
        >
          {meta.scene}
        </span>
      </div>

      {/* 吉祥物贴纸：右上 chrome 带内（SAFE.top 之上无内容，天然不打架），
          Q 弹入场后 ≤5px 浮动（reduced 停） */}
      <div style={{ position: "absolute", right: 56, top: 34 }}>
        <MascotSticker size={64} enterAt={CHROME_T.stampIn} />
      </div>

      {/* 底部课程进度点：当前 ink 实心盖章放大 1.35 · 已过粉彩芯 + ink 描边 · 未来细描边空心 */}
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
                    ? inkTone
                    : isDone
                      ? pastel
                      : "transparent",
                  border: isCurrent
                    ? "none"
                    : `2px solid ${withAlpha(inkTone, isDone ? 0.5 : 0.25)}`,
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
