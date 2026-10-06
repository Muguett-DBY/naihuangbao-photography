import { Fragment, useEffect, useState, type FC } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * FlowScene — 流程场景。
 * 标题先行入场，随后步骤节点依次弹出、节点之间的连接线随之生长，
 * 呈现"步骤逐级串联展开"的流程图动画。
 *
 * 动画完全由 useCurrentFrame() 驱动（确定性渲染），
 * 并尊重 prefers-reduced-motion：开启时直接呈现最终静态画面。
 */

export interface FlowSceneProps {
  title: string;
  steps: string[];
}

/** 时序常量（帧，基于 30fps 设计，其他 fps 等比换算由调用方通过 duration helper 处理） */
const TITLE_ENTER_FRAMES = 26;
const STEP_STAGGER_FRAMES = 12;
const CONNECTOR_LEAD_FRAMES = 5;
const CONNECTOR_GROW_FRAMES = 14;
const TAIL_HOLD_FRAMES = 36;

/** 该场景完成全部动画（含收尾停留）所需的时长（帧）。用于注册 <Composition> 时给定 durationInFrames。 */
export const flowSceneDurationInFrames = (stepCount: number): number => {
  if (stepCount <= 0) return TITLE_ENTER_FRAMES + TAIL_HOLD_FRAMES;
  const lastNode = TITLE_ENTER_FRAMES + (stepCount - 1) * STEP_STAGGER_FRAMES;
  return lastNode + CONNECTOR_GROW_FRAMES + TAIL_HOLD_FRAMES;
};

const COLORS = {
  paper: "#fff8f0",
  ink: "#2a2118",
  accent: "#b1544e",
  accentSoft: "#f6e5e2",
  muted: "rgba(42, 33, 24, 0.58)",
  line: "rgba(42, 33, 24, 0.16)",
  card: "#fffdf9",
} as const;

const FONT_STACK =
  '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif';

/** 与项目其余课堂组件一致的 reduced-motion 探测（见 components/law/classroom/TeacherBubble.tsx） */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

const nodeDelay = (index: number): number =>
  TITLE_ENTER_FRAMES + index * STEP_STAGGER_FRAMES;

export const FlowScene: FC<FlowSceneProps> = ({ title, steps }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const reduced = usePrefersReducedMotion();

  const scale = Math.min(width, height) / 1080;
  const compact = steps.length >= 6;

  // —— 标题 ——
  const titleOpacity = reduced
    ? 1
    : interpolate(frame, [0, TITLE_ENTER_FRAMES * 0.6], [0, 1], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const titleRise = reduced
    ? 0
    : interpolate(frame, [0, TITLE_ENTER_FRAMES * 0.8], [26 * scale, 0], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const barGrow = reduced
    ? 1
    : interpolate(frame, [8, TITLE_ENTER_FRAMES], [0, 1], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  const nodeSize = (compact ? 64 : 78) * scale;
  const labelWidth = (compact ? 116 : 148) * scale;
  const labelSize = (compact ? 21 : 24) * scale;
  const numberSize = (compact ? 24 : 28) * scale;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 560px at 50% -12%, ${COLORS.accentSoft}, transparent 70%), ${COLORS.paper}`,
        fontFamily: FONT_STACK,
        color: COLORS.ink,
        justifyContent: "center",
        alignItems: "center",
        padding: 64 * scale,
      }}
    >
      {/* 标题 */}
      <div style={{ textAlign: "center", marginBottom: 72 * scale }}>
        <h1
          style={{
            margin: 0,
            fontSize: 58 * scale,
            fontWeight: 700,
            letterSpacing: "0.04em",
            opacity: titleOpacity,
            transform: `translateY(${titleRise}px)`,
          }}
        >
          {title}
        </h1>
        <div
          style={{
            width: 96 * scale,
            height: 5 * scale,
            margin: `${26 * scale}px auto 0`,
            borderRadius: 999,
            background: COLORS.accent,
            transform: `scaleX(${barGrow})`,
          }}
        />
      </div>

      {/* 步骤节点 + 连接线 */}
      {steps.length > 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            width: "100%",
          }}
        >
          {steps.map((step, index) => {
            const delay = nodeDelay(index);
            const pop = reduced
              ? 1
              : spring({
                  frame,
                  fps,
                  delay,
                  config: { damping: 12, mass: 0.6 },
                });
            const labelOpacity = reduced
              ? 1
              : interpolate(frame, [delay + 4, delay + 16], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
            const labelRise = reduced
              ? 0
              : interpolate(frame, [delay + 4, delay + 16], [12 * scale, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });

            return (
              <Fragment key={`${index}-${step}`}>
                {index > 0 ? (
                  <Connector
                    frame={frame}
                    delay={Math.max(0, delay - CONNECTOR_LEAD_FRAMES)}
                    nodeSize={nodeSize}
                    reduced={reduced}
                  />
                ) : null}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: labelWidth,
                  }}
                >
                  <div
                    style={{
                      width: nodeSize,
                      height: nodeSize,
                      borderRadius: "50%",
                      background: COLORS.accentSoft,
                      border: `${3 * scale}px solid ${COLORS.accent}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: numberSize,
                      fontWeight: 700,
                      color: COLORS.accent,
                      opacity: Math.min(1, pop * 1.6),
                      transform: `scale(${0.55 + 0.45 * pop})`,
                    }}
                  >
                    {index + 1}
                  </div>
                  <p
                    style={{
                      margin: `${18 * scale}px 0 0`,
                      fontSize: labelSize,
                      lineHeight: 1.45,
                      textAlign: "center",
                      opacity: labelOpacity,
                      transform: `translateY(${labelRise}px)`,
                    }}
                  >
                    {step}
                  </p>
                </div>
              </Fragment>
            );
          })}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** 节点间连接线：底为浅色轨道，内部砖红色线段按进度从左向右生长 */
const Connector: FC<{
  frame: number;
  delay: number;
  nodeSize: number;
  reduced: boolean;
}> = ({ frame, delay, nodeSize, reduced }) => {
  const { width, height } = useVideoConfig();
  const scale = Math.min(width, height) / 1080;

  const progress = reduced
    ? 1
    : interpolate(frame, [delay, delay + CONNECTOR_GROW_FRAMES], [0, 1], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  return (
    <div
      style={{
        flex: 1,
        height: 4 * scale,
        margin: `0 ${10 * scale}px`,
        marginTop: nodeSize / 2 - 2 * scale,
        borderRadius: 999,
        background: COLORS.line,
        position: "relative",
        overflow: "hidden",
        alignSelf: "flex-start",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${progress * 100}%`,
          background: COLORS.accent,
        }}
      />
    </div>
  );
};
