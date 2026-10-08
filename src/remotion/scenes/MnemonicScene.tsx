import { type FC } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { LawSubjectId } from "../../types/law";
import { SceneChrome, usePrefersReducedMotion, useStageProgress } from "../chrome";
import { C, F, SUBJECT_ACCENTS, sceneFrameStyle, withAlpha } from "../theme";

/**
 * MnemonicScene — 口诀记忆卡（图解版）。四段式节奏：
 *   ① 逐字入场：口诀每个字依次浮入（spring 上浮 + 淡入，保留）；
 *   ② 停留：口诀完整停留，下划线在停留期内从中心划出；
 *   ③ 盖住→揭示：一张遮罩从左擦入盖住口诀（试背时刻），停顿后从右
 *      擦出揭示——帧驱动遮罩擦除动画，呼应"先背再对答案"的记忆节奏；
 *   ④ 逐句揭示：解释文本按句号/问号等断句，一句一句上滑淡入。
 *
 * 动画完全由 useCurrentFrame() + interpolate()/spring() 驱动（确定性渲染，
 * 无 Math.random），全部走 chrome.tsx 的帧驱动 helpers；配色弃用硬编码，
 * 统一走 theme（C/F/SUBJECT_ACCENTS），accent 缺省取 xianfa 学科色 token
 * （与旧版 #b1544e 视觉一致）。尊重 prefers-reduced-motion：定格在"揭示
 * 完成"的最终静态画面（遮罩不出现）。SceneChrome 包壳提供徽标/淡晕/进度点。
 */

export interface MnemonicSceneProps {
  mnemonic: string;
  explanation: string;
  /** 强调色（下划线/遮罩虚线/淡晕），缺省 xianfa 学科色 token */
  accent?: string;
  /** 学科（SceneChrome 淡晕兜底色） */
  subject?: LawSubjectId;
  /** 第几场（0-based，SceneChrome 进度点用；未接线时不显示进度点） */
  sceneIndex?: number;
  /** 共几场（SceneChrome 进度点用） */
  sceneTotal?: number;
}

/** 时序常量（帧，30fps 基准） */
const CHAR_STAGGER_FRAMES = 3;
const CHAR_ENTER_FRAMES = 14;
const HOLD_FRAMES = 42;
const UNDERLINE_FRAMES = 20;
const COVER_IN_FRAMES = 16; // 遮罩擦入（盖住）
const COVER_HOLD_FRAMES = 30; // 盖住停顿（试背时刻）
const COVER_OUT_FRAMES = 16; // 遮罩擦出（揭示）
const SENTENCE_GAP_FRAMES = 6;
const SENTENCE_STAGGER_FRAMES = 16;
const SENTENCE_ENTER_FRAMES = 22;
const TAIL_HOLD_FRAMES = 36;

const charsDoneFrame = (mnemonic: string): number => {
  const count = Array.from(mnemonic.trim()).length;
  if (count === 0) return 0;
  return (count - 1) * CHAR_STAGGER_FRAMES + CHAR_ENTER_FRAMES;
};

/** 遮罩完全盖住的时刻 */
const coveredAt = (mnemonic: string): number =>
  charsDoneFrame(mnemonic) + HOLD_FRAMES + COVER_IN_FRAMES;

/** 按中文/英文句读符号断句 */
const splitSentences = (explanation: string): string[] =>
  explanation
    .split(/(?<=[。！？!?；;])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

/** 该场景完成全部动画（含遮罩擦除与收尾停留）所需的时长（帧）。 */
export const mnemonicSceneDurationInFrames = (
  mnemonic: string,
  explanation: string,
): number => {
  const revealed =
    coveredAt(mnemonic) + COVER_HOLD_FRAMES + COVER_OUT_FRAMES;
  const sentenceCount = splitSentences(explanation).length;
  const revealDone =
    sentenceCount > 0
      ? revealed +
        SENTENCE_GAP_FRAMES +
        (sentenceCount - 1) * SENTENCE_STAGGER_FRAMES +
        SENTENCE_ENTER_FRAMES
      : revealed;
  return revealDone + TAIL_HOLD_FRAMES;
};

export const MnemonicScene: FC<MnemonicSceneProps> = ({
  mnemonic,
  explanation,
  accent = SUBJECT_ACCENTS.xianfa.accent,
  subject,
  sceneIndex,
  sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const reduced = usePrefersReducedMotion();
  const progress = useStageProgress();

  const chars = Array.from(mnemonic.trim());
  const sentences = splitSentences(explanation);

  const charsDone = charsDoneFrame(mnemonic);
  const startCover = charsDone + HOLD_FRAMES;
  const covered = coveredAt(mnemonic);
  const uncoverAt = covered + COVER_HOLD_FRAMES;
  const revealedAt = uncoverAt + COVER_OUT_FRAMES;

  // —— 阶段② 停留期：下划线从中心划出 ——
  const underlineGrow = reduced
    ? 1
    : interpolate(frame, [charsDone, charsDone + UNDERLINE_FRAMES], [0, 1], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  // —— 阶段③ 盖住→揭示：遮罩 scaleX 擦入（origin 左）→ 擦出（origin 右）——
  const coverScale = reduced
    ? 0
    : frame < uncoverAt
      ? interpolate(frame, [startCover, covered], [0, 1], {
          easing: Easing.inOut(Easing.cubic),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : interpolate(frame, [uncoverAt, revealedAt], [1, 0], {
          easing: Easing.inOut(Easing.cubic),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const coverOrigin = frame < uncoverAt ? "left center" : "right center";
  const hintOpacity = reduced
    ? 0
    : interpolate(
        frame,
        [covered - 4, covered + 6, uncoverAt - 8, uncoverAt],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );

  // 口诀字号随字数自适应
  const mnemonicSize =
    chars.length > 20 ? 44 : chars.length > 12 ? 58 : 72;

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper }}>
      <AbsoluteFill
        style={{
          ...sceneFrameStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <section
          style={{
            width: "100%",
            backgroundColor: C.surface,
            border: `2px solid ${C.line}`,
            borderRadius: 28,
            padding: "56px 60px",
            boxShadow: "0 24px 64px rgba(50, 42, 40, 0.08)",
          }}
        >
          {/* 阶段① 逐字入场（保留）+ 阶段③ 盖住→揭示遮罩（覆盖整个口诀区） */}
          <div
            style={{
              position: "relative",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "6px 10px",
            }}
          >
            {chars.map((char, index) => {
              const pop = progress(index * CHAR_STAGGER_FRAMES, {
                damping: 13,
                mass: 0.5,
                stiffness: 170,
                overshootClamping: false,
              });
              return (
                <span
                  key={`${index}-${char}`}
                  style={{
                    display: "inline-block",
                    fontFamily: F.zhSerifSemi,
                    fontSize: mnemonicSize,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    color: C.ink,
                    whiteSpace: "pre",
                    opacity: Math.min(1, pop * 1.5),
                    transform: `translateY(${(1 - pop) * 30}px) scale(${0.82 + 0.18 * pop})`,
                  }}
                >
                  {char}
                </span>
              );
            })}

            {/* 遮罩：纸色卡片盖住口诀，虚线描边示意"先自己背一遍" */}
            {coverScale > 0.001 && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: -14,
                  borderRadius: 18,
                  backgroundColor: C.paper,
                  border: `2px dashed ${withAlpha(accent, 0.45)}`,
                  boxShadow: "0 12px 30px rgba(50, 42, 40, 0.10)",
                  transform: `scaleX(${coverScale})`,
                  transformOrigin: coverOrigin,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: F.zhSans,
                    fontSize: 26,
                    letterSpacing: "0.2em",
                    color: C.gray,
                    opacity: hintOpacity,
                  }}
                >
                  盖住了 · 先背一遍
                </span>
              </div>
            )}
          </div>

          {/* 阶段② 停留期下划线 */}
          <div
            aria-hidden="true"
            style={{
              width: "64%",
              height: 6,
              margin: "40px auto 44px",
              borderRadius: 999,
              backgroundColor: accent,
              transform: `scaleX(${underlineGrow})`,
            }}
          />

          {/* 阶段④ 逐句揭示（揭示遮罩揭开后开始） */}
          {sentences.length > 0 ? (
            <div>
              {sentences.map((sentence, index) => {
                const delay =
                  revealedAt +
                  SENTENCE_GAP_FRAMES +
                  index * SENTENCE_STAGGER_FRAMES;
                const opacity = reduced
                  ? 1
                  : interpolate(
                      frame,
                      [delay, delay + SENTENCE_ENTER_FRAMES],
                      [0, 1],
                      {
                        easing: Easing.out(Easing.cubic),
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      },
                    );
                const rise = reduced
                  ? 0
                  : interpolate(
                      frame,
                      [delay, delay + SENTENCE_ENTER_FRAMES],
                      [20, 0],
                      {
                        easing: Easing.out(Easing.cubic),
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      },
                    );
                return (
                  <p
                    key={`${index}-${sentence}`}
                    style={{
                      margin: `0 0 ${18}px`,
                      fontFamily: F.zhSerif,
                      fontSize: 28,
                      lineHeight: 1.7,
                      color: withAlpha(C.ink, 0.78),
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
        </section>
      </AbsoluteFill>

      {/* 视觉底座叠加层：类型徽标 + 学科色淡晕 + 课程进度点 */}
      <SceneChrome
        type="mnemonic"
        subject={subject ?? "falixue"}
        accent={accent}
        index={sceneIndex ?? 0}
        total={sceneTotal ?? 0}
      />
    </AbsoluteFill>
  );
};
