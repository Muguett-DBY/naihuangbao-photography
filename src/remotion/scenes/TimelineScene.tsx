import { useEffect, useState, type FC } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * TimelineScene — 时间线场景。
 * 标题入场后，垂直时间轴自上而下生长，事件（时间 + 描述）随轴尖到达依次点亮：
 * 圆点弹出 → 时间与描述从左滑入。轴尖带一枚高亮点，生长结束后淡出。
 *
 * 动画完全由 useCurrentFrame() 驱动（确定性渲染），
 * 尊重 prefers-reduced-motion：开启时直接呈现最终静态画面。
 */

export interface TimelineEvent {
  time: string;
  event: string;
}

export interface TimelineSceneProps {
  title: string;
  events: TimelineEvent[];
}

/** 时序常量（帧） */
const TITLE_ENTER_FRAMES = 24;
const AXIS_START_FRAME = 14;
const AXIS_PER_EVENT_FRAMES = 14;
const AXIS_MIN_FRAMES = 20;
const TAIL_HOLD_FRAMES = 36;

/** 该场景完成全部动画（含收尾停留）所需的时长（帧）。 */
export const timelineSceneDurationInFrames = (eventCount: number): number => {
  const axisDuration = axisDurationFor(eventCount);
  return AXIS_START_FRAME + axisDuration + 18 + TAIL_HOLD_FRAMES;
};

const axisDurationFor = (eventCount: number): number =>
  eventCount > 0
    ? Math.max(AXIS_MIN_FRAMES, eventCount * AXIS_PER_EVENT_FRAMES)
    : AXIS_MIN_FRAMES;

const COLORS = {
  paper: "#fff8f0",
  ink: "#2a2118",
  accent: "#b1544e",
  accentSoft: "#f6e5e2",
  muted: "rgba(42, 33, 24, 0.58)",
  line: "rgba(42, 33, 24, 0.16)",
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

export const TimelineScene: FC<TimelineSceneProps> = ({ title, events }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const reduced = usePrefersReducedMotion();

  const scale = Math.min(width, height) / 1080;

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
    : interpolate(frame, [0, TITLE_ENTER_FRAMES * 0.8], [24 * scale, 0], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  // —— 时间轴生长 ——
  const axisDuration = axisDurationFor(events.length);
  const axisProgress = reduced
    ? 1
    : interpolate(
        frame,
        [AXIS_START_FRAME, AXIS_START_FRAME + axisDuration],
        [0, 1],
        {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        },
      );
  const tipFade = reduced
    ? 0
    : interpolate(axisProgress, [0.94, 1], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  const axisX = 20 * scale;
  const axisWidth = 5 * scale;
  const axisCenter = axisX + axisWidth / 2;
  const rowHeight = 104 * scale;
  const dotSize = 18 * scale;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1100px 520px at 88% -10%, ${COLORS.accentSoft}, transparent 70%), ${COLORS.paper}`,
        fontFamily: FONT_STACK,
        color: COLORS.ink,
        padding: `${72 * scale}px ${96 * scale}px`,
      }}
    >
      {/* 标题 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20 * scale,
          marginBottom: 56 * scale,
          opacity: titleOpacity,
          transform: `translateY(${titleRise}px)`,
        }}
      >
        <div
          style={{
            width: 6 * scale,
            height: 52 * scale,
            borderRadius: 999,
            background: COLORS.accent,
          }}
        />
        <h1 style={{ margin: 0, fontSize: 54 * scale, fontWeight: 700, letterSpacing: "0.04em" }}>
          {title}
        </h1>
      </div>

      {/* 时间轴 + 事件 */}
      {events.length > 0 ? (
        <div style={{ position: "relative", flex: 1 }}>
          {/* 轨道（浅色底） */}
          <div
            style={{
              position: "absolute",
              left: axisX,
              top: 0,
              bottom: 0,
              width: axisWidth,
              borderRadius: 999,
              background: COLORS.line,
            }}
          />
          {/* 生长的轴线 */}
          <div
            style={{
              position: "absolute",
              left: axisX,
              top: 0,
              bottom: 0,
              width: axisWidth,
              borderRadius: 999,
              background: COLORS.accent,
              transformOrigin: "top",
              transform: `scaleY(${axisProgress})`,
            }}
          />
          {/* 轴尖高亮点 */}
          {tipFade > 0.01 ? (
            <div
              style={{
                position: "absolute",
                left: axisCenter,
                top: `${axisProgress * 100}%`,
                width: dotSize * 1.6,
                height: dotSize * 1.6,
                borderRadius: "50%",
                background: COLORS.accent,
                boxShadow: `0 0 ${18 * scale}px ${4 * scale}px ${COLORS.accentSoft}`,
                opacity: tipFade,
                transform: "translate(-50%, -50%)",
              }}
            />
          ) : null}

          {events.map((item, index) => {
            const appearAt =
              AXIS_START_FRAME + ((index + 0.5) / events.length) * axisDuration;
            const pop = reduced
              ? 1
              : spring({ frame, fps, delay: appearAt, config: { damping: 12, mass: 0.5 } });
            const textOpacity = reduced
              ? 1
              : interpolate(frame, [appearAt + 2, appearAt + 18], [0, 1], {
                  easing: Easing.out(Easing.cubic),
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
            const textSlide = reduced
              ? 0
              : interpolate(frame, [appearAt + 2, appearAt + 18], [26 * scale, 0], {
                  easing: Easing.out(Easing.cubic),
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
              });

            return (
              <div
                key={`${index}-${item.time}`}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 28 * scale,
                  height: rowHeight,
                  paddingLeft: 72 * scale,
                }}
              >
                {/* 事件圆点，钉在轴线上 */}
                <div
                  style={{
                    position: "absolute",
                    left: axisCenter,
                    top: "50%",
                    width: dotSize,
                    height: dotSize,
                    borderRadius: "50%",
                    background: COLORS.accentSoft,
                    border: `${3 * scale}px solid ${COLORS.accent}`,
                    opacity: Math.min(1, pop * 1.6),
                    transform: `translate(-50%, -50%) scale(${0.4 + 0.6 * pop})`,
                  }}
                />
                <span
                  style={{
                    width: 150 * scale,
                    flexShrink: 0,
                    fontSize: 26 * scale,
                    fontWeight: 700,
                    color: COLORS.accent,
                    fontVariantNumeric: "tabular-nums",
                    opacity: textOpacity,
                  }}
                >
                  {item.time}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 27 * scale,
                    lineHeight: 1.5,
                    opacity: textOpacity,
                    transform: `translateX(${textSlide}px)`,
                  }}
                >
                  {item.event}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
