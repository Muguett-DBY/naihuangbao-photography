import { useSyncExternalStore } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/** 对比场景的一行内容。 */
export interface CompareRow {
  left: string;
  right: string;
}

/** 对比场景入参：左右两栏标题 + 若干对照行，左右分栏交错入场。 */
export interface CompareSceneProps {
  leftTitle: string;
  rightTitle: string;
  rows: CompareRow[];
  /** 右栏强调色，与左栏区分。 */
  rightAccent?: string;
}

const ROW_STAGGER_FRAMES = 4;
const PANEL_ENTER_FRAMES = 2;
const PANEL_CROSS_FRAMES = 5;
const ROWS_ENTER_FRAMES = 14;

const palette = {
  background: "#fdfaf3",
  ink: "#221b14",
  muted: "#6f6459",
  card: "#ffffff",
  cardWarm: "#fff6ec",
  cardBorder: "rgba(34, 27, 20, 0.08)",
  leftAccent: "#3f6fae",
  rightAccent: "#c2552b",
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

/**
 * 左右分栏对比：整栏先分别从左/右滑入（右栏延迟交错），
 * 行内容再按"左、右、左、右"交错 spring 入场，中缝分隔线同步生长。
 */
export function CompareScene({
  leftTitle,
  rightTitle,
  rows,
  rightAccent = palette.rightAccent,
}: CompareSceneProps) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const reducedMotion = usePrefersReducedMotion();
  const s = height / 1080;

  // 整栏入场：左栏从左缘滑入，右栏稍晚从右缘滑入，形成交错节奏。
  const leftPanelEnter = reducedMotion
    ? 1
    : spring({
        frame: frame - PANEL_ENTER_FRAMES,
        fps,
        config: { damping: 15, mass: 0.8, stiffness: 120 },
      });
  const rightPanelEnter = reducedMotion
    ? 1
    : spring({
        frame: frame - PANEL_ENTER_FRAMES - PANEL_CROSS_FRAMES,
        fps,
        config: { damping: 15, mass: 0.8, stiffness: 120 },
      });
  const leftPanelX = interpolate(leftPanelEnter, [0, 1], [-56, 0]);
  const rightPanelX = interpolate(rightPanelEnter, [0, 1], [56, 0]);
  const dividerScale = interpolate(
    Math.min(leftPanelEnter, rightPanelEnter),
    [0, 1],
    [0, 1],
  );

  const renderColumn = (
    side: "left" | "right",
    title: string,
    panelEnter: number,
    panelX: number,
    accent: string,
    cellBackground: string,
  ) => (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 18 * s,
        opacity: interpolate(panelEnter, [0, 1], [0, 1]),
        transform: `translateX(${panelX * s}px)`,
      }}
    >
      <div
        style={{
          padding: `${16 * s}px ${24 * s}px`,
          borderRadius: 16 * s,
          background: accent,
          color: "#fff",
          fontSize: 40 * s,
          fontWeight: 700,
          textAlign: "center",
        }}
      >
        {title}
      </div>
      {rows.map((row, index) => {
        const value = side === "left" ? row.left : row.right;
        // 行级交错：同一行右栏比左栏晚 2 帧入场，形成"左→右"读向节奏。
        const start =
          ROWS_ENTER_FRAMES + index * ROW_STAGGER_FRAMES + (side === "right" ? 2 : 0);
        const enter = reducedMotion
          ? 1
          : spring({
              frame: frame - start,
              fps,
              config: { damping: 12, mass: 0.8, stiffness: 130 },
            });
        const cellY = interpolate(enter, [0, 1], [26, 0]);
        const cellOpacity = interpolate(enter, [0, 1], [0, 1]);

        return (
          <div
            key={`${side}-${index}-${value}`}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              padding: `${18 * s}px ${24 * s}px`,
              borderRadius: 14 * s,
              background: cellBackground,
              border: `1px solid ${palette.cardBorder}`,
              borderTop: `3px solid ${accent}`,
              fontSize: 30 * s,
              color: palette.ink,
              lineHeight: 1.45,
              opacity: cellOpacity,
              transform: `translateY(${cellY * s}px)`,
            }}
          >
            {value}
          </div>
        );
      })}
    </div>
  );

  return (
    <AbsoluteFill style={{ background: palette.background, padding: 96 * s }}>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 36 * s,
          height: "100%",
        }}
      >
        {renderColumn(
          "left",
          leftTitle,
          leftPanelEnter,
          leftPanelX,
          palette.leftAccent,
          palette.card,
        )}
        <div
          aria-hidden="true"
          style={{
            flex: "none",
            width: 2 * s,
            background: palette.muted,
            opacity: 0.25,
            transform: `scaleY(${dividerScale})`,
          }}
        />
        {renderColumn(
          "right",
          rightTitle,
          rightPanelEnter,
          rightPanelX,
          rightAccent,
          palette.cardWarm,
        )}
      </div>
    </AbsoluteFill>
  );
}
