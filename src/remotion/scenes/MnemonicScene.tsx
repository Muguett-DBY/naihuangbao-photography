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
 * MnemonicScene — 口诀记忆卡。
 * 三段式节奏：
 *   ① 逐字入场：口诀每个字依次浮入（spring 上浮 + 淡入）；
 *   ② 停留：口诀完整停留，下划线在停留期内从中心划出；
 *   ③ 逐句揭示：解释文本按句号/问号等断句，一句一句上滑淡入。
 *
 * 动画完全由 useCurrentFrame() 驱动（确定性渲染），
 * 尊重 prefers-reduced-motion：开启时直接呈现最终静态画面。
 */

export interface MnemonicSceneProps {
  mnemonic: string;
  explanation: string;
}

/** 时序常量（帧） */
const CHAR_STAGGER_FRAMES = 3;
const CHAR_ENTER_FRAMES = 14;
const HOLD_FRAMES = 42;
const UNDERLINE_FRAMES = 20;
const SENTENCE_STAGGER_FRAMES = 16;
const SENTENCE_ENTER_FRAMES = 22;
const TAIL_HOLD_FRAMES = 36;

/** 该场景完成全部动画（含收尾停留）所需的时长（帧）。 */
export const mnemonicSceneDurationInFrames = (
  mnemonic: string,
  explanation: string,
): number => {
  const charsDone = charsDoneFrame(mnemonic);
  const revealStart = charsDone + HOLD_FRAMES;
  const sentenceCount = splitSentences(explanation).length;
  const revealDone =
    sentenceCount > 0
      ? revealStart + (sentenceCount - 1) * SENTENCE_STAGGER_FRAMES + SENTENCE_ENTER_FRAMES
      : charsDone + HOLD_FRAMES;
  return revealDone + TAIL_HOLD_FRAMES;
};

const charsDoneFrame = (mnemonic: string): number => {
  const count = Array.from(mnemonic.trim()).length;
  if (count === 0) return 0;
  return (count - 1) * CHAR_STAGGER_FRAMES + CHAR_ENTER_FRAMES;
};

/** 按中文/英文句读符号断句 */
const splitSentences = (explanation: string): string[] =>
  explanation
    .split(/(?<=[。！？!?；;])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const COLORS = {
  paper: "#fff8f0",
  ink: "#2a2118",
  accent: "#b1544e",
  accentSoft: "#f6e5e2",
  muted: "rgba(42, 33, 24, 0.62)",
  line: "rgba(42, 33, 24, 0.12)",
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

export const MnemonicScene: FC<MnemonicSceneProps> = ({
  mnemonic,
  explanation,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const reduced = usePrefersReducedMotion();

  const scale = Math.min(width, height) / 1080;
  const chars = Array.from(mnemonic.trim());
  const sentences = splitSentences(explanation);

  const charsDone = charsDoneFrame(mnemonic);
  const revealStart = charsDone + HOLD_FRAMES;

  // —— 阶段② 停留期：下划线从中心划出 ——
  const underlineGrow = reduced
    ? 1
    : interpolate(
        frame,
        [charsDone, charsDone + UNDERLINE_FRAMES],
        [0, 1],
        {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        },
      );

  // 口诀字号随字数自适应
  const mnemonicSize =
    chars.length > 20 ? 40 * scale : chars.length > 12 ? 52 * scale : 64 * scale;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1100px 540px at 50% -12%, ${COLORS.accentSoft}, transparent 70%), ${COLORS.paper}`,
        fontFamily: FONT_STACK,
        color: COLORS.ink,
        justifyContent: "center",
        alignItems: "center",
        padding: 72 * scale,
      }}
    >
      <div
        style={{
          width: "min(100%, 1360px)",
          background: COLORS.card,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 28 * scale,
          padding: `${64 * scale}px ${80 * scale}px`,
          boxShadow: `0 ${24 * scale}px ${64 * scale}px rgba(42, 33, 24, 0.08)`,
        }}
      >
        {/* 徽标 */}
        <div
          style={{
            display: "inline-block",
            fontSize: 22 * scale,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: COLORS.accent,
            background: COLORS.accentSoft,
            borderRadius: 999,
            padding: `${8 * scale}px ${24 * scale}px`,
            marginBottom: 36 * scale,
          }}
        >
          口诀
        </div>

        {/* 阶段① 逐字入场 */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: `${4 * scale}px ${6 * scale}px`,
          }}
        >
          {chars.map((char, index) => {
            const delay = index * CHAR_STAGGER_FRAMES;
            const pop = reduced
              ? 1
              : spring({
                  frame,
                  fps,
                  delay,
                  config: { damping: 13, mass: 0.5 },
                });
            return (
              <span
                key={`${index}-${char}`}
                style={{
                  display: "inline-block",
                  fontSize: mnemonicSize,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  whiteSpace: "pre",
                  opacity: Math.min(1, pop * 1.5),
                  transform: `translateY(${(1 - pop) * 30 * scale}px) scale(${0.82 + 0.18 * pop})`,
                }}
              >
                {char}
              </span>
            );
          })}
        </div>

        {/* 阶段② 停留期下划线 */}
        <div
          style={{
            width: `${64 * scale}%`,
            height: 5 * scale,
            margin: `${36 * scale}px auto ${44 * scale}px`,
            borderRadius: 999,
            background: COLORS.accent,
            transform: `scaleX(${underlineGrow})`,
          }}
        />

        {/* 阶段③ 逐句揭示 */}
        {sentences.length > 0 ? (
          <div>
            {sentences.map((sentence, index) => {
              const delay = revealStart + index * SENTENCE_STAGGER_FRAMES;
              const opacity = reduced
                ? 1
                : interpolate(frame, [delay, delay + SENTENCE_ENTER_FRAMES], [0, 1], {
                    easing: Easing.out(Easing.cubic),
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
              const rise = reduced
                ? 0
                : interpolate(frame, [delay, delay + SENTENCE_ENTER_FRAMES], [20 * scale, 0], {
                    easing: Easing.out(Easing.cubic),
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  });
              return (
                <p
                  key={`${index}-${sentence}`}
                  style={{
                    margin: `0 0 ${18 * scale}px`,
                    fontSize: 26 * scale,
                    lineHeight: 1.7,
                    color: COLORS.muted,
                    opacity,
                    transform: `translateY(${rise}px)`,
                  }}
                >
                  {sentence}
                </p>
              );
            })}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
