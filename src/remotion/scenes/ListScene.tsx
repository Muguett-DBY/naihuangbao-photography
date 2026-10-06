import { useSyncExternalStore } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/** 列举场景入参：标题 + 若干条目，条目逐个 spring 入场。 */
export interface ListSceneProps {
  title: string;
  items: string[];
  /** 强调色（编号徽章 / 标题下划线），默认品牌赭橙色。 */
  accent?: string;
}

const ITEM_STAGGER_FRAMES = 4;
const TITLE_ENTER_FRAMES = 2;
const ITEMS_ENTER_FRAMES = 14;

const palette = {
  background: "#fdfaf3",
  ink: "#221b14",
  muted: "#6f6459",
  card: "#ffffff",
  cardBorder: "rgba(34, 27, 20, 0.08)",
} as const;

let reducedMotionQuery: MediaQueryList | null = null;

function getReducedMotionQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  reducedMotionQuery ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  return reducedMotionQuery;
}

/**
 * 尊重系统"减弱动态效果"设置：命中时所有元素直接呈现最终状态，
 * 不做位移/缩放动画（渲染环境无 matchMedia 时同样按最终状态渲染）。
 */
function usePrefersReducedMotion(): boolean {
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

/** 条目 spring 入场：从下方 32px 上浮 + 淡入，编号徽章同时放大归位。 */
export function ListScene({ title, items, accent = "#c2552b" }: ListSceneProps) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const reducedMotion = usePrefersReducedMotion();
  // 以 1080p 为基准做等比缩放，合成分辨率变化时排版保持一致。
  const s = height / 1080;

  const titleEnter = reducedMotion
    ? 1
    : spring({
        frame: frame - TITLE_ENTER_FRAMES,
        fps,
        config: { damping: 14, mass: 0.7, stiffness: 150 },
      });
  const titleY = interpolate(titleEnter, [0, 1], [26, 0]);
  const titleOpacity = interpolate(titleEnter, [0, 1], [0, 1]);
  const underlineWidth = interpolate(titleEnter, [0, 1], [0, 88]) * s;

  return (
    <AbsoluteFill style={{ background: palette.background, padding: 96 * s }}>
      <h2
        style={{
          margin: 0,
          fontFamily: "inherit",
          fontSize: 64 * s,
          fontWeight: 700,
          color: palette.ink,
          lineHeight: 1.2,
          opacity: titleOpacity,
          transform: `translateY(${titleY * s}px)`,
        }}
      >
        {title}
      </h2>
      <div
        aria-hidden="true"
        style={{
          width: underlineWidth,
          height: 6 * s,
          borderRadius: 3 * s,
          background: accent,
          margin: "18px 0 40px",
        }}
      />
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 22 * s,
        }}
      >
        {items.map((item, index) => {
          const start = ITEMS_ENTER_FRAMES + index * ITEM_STAGGER_FRAMES;
          const enter = reducedMotion
            ? 1
            : spring({
                frame: frame - start,
                fps,
                config: { damping: 12, mass: 0.8, stiffness: 130 },
              });
          const itemY = interpolate(enter, [0, 1], [32, 0]);
          const itemOpacity = interpolate(enter, [0, 1], [0, 1]);
          const badgeScale = interpolate(enter, [0, 1], [0.6, 1]);

          return (
            <li
              key={`${item}-${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20 * s,
                opacity: itemOpacity,
                transform: `translateY(${itemY * s}px)`,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flex: "none",
                  width: 48 * s,
                  height: 48 * s,
                  borderRadius: "50%",
                  background: accent,
                  color: "#fff",
                  fontSize: 24 * s,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${badgeScale})`,
                }}
              >
                {index + 1}
              </span>
              <span
                style={{
                  flex: 1,
                  padding: `${18 * s}px ${26 * s}px`,
                  borderRadius: 16 * s,
                  background: palette.card,
                  border: `1px solid ${palette.cardBorder}`,
                  fontSize: 34 * s,
                  color: palette.ink,
                  lineHeight: 1.45,
                }}
              >
                {item}
              </span>
            </li>
          );
        })}
      </ul>
    </AbsoluteFill>
  );
}
