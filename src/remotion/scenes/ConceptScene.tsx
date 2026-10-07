import { useEffect, useMemo, useState, type FC } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type SpringConfig,
} from "remotion";
import {
  C,
  CONTENT_WIDTH,
  F,
  SPRING,
  T,
  sceneFrameStyle,
  withAlpha,
} from "../theme";

/**
 * 概念场景：标题 spring 入场 → 正文逐段 fade → 关键术语高亮脉冲。
 * 动画全部由 useCurrentFrame() + interpolate()/spring() 驱动（无 Math.random，
 * 同帧必然同画面，可确定性渲染）；内容全部来自 props。
 */

export interface ConceptSceneProps {
  /** 场景主标题（如"犯罪构成的四要件装配"） */
  title: string;
  /** 正文段落，逐段 fade 入场 */
  content: readonly string[];
  /** 关键术语：正文中出现处高亮脉冲 + 底部术语条逐个弹出 */
  keyTerms: readonly string[];
  /** 本场景强调色（学科色，见 theme.ts 的 SUBJECT_ACCENTS） */
  accent: string;
}

/** 术语命中：在正文里的一次出现（起止偏移为该段文本内的下标） */
interface TermHit {
  term: string;
  /** 该术语在 keyTerms 里的序号，决定脉冲起跳帧 */
  order: number;
  start: number;
  end: number;
}

/** 正文切分结果：命中片段（高亮）与普通文本相间 */
interface TextSegment {
  text: string;
  hit: TermHit | null;
}

/**
 * respects prefers-reduced-motion：系统声明"减少动态效果"时，
 * 入场动画定格在最终帧、脉冲停驻为静态高亮。
 * （当前 remotion@4.0.533 未导出 useReducedMotion，故用 matchMedia 自行接线；
 *  服务端无 window 时返回 false，保证渲染管线按完整动画出片。）
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent): void => setReduced(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** 帧号 → spring 进度，reduced 时定格终态；进度恒夹在 [0,1] */
function useStageProgress(): (startFrame: number, config: SpringConfig) => number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = usePrefersReducedMotion();
  return (startFrame, config) => {
    if (reduced) return 1;
    return spring({ frame: frame - startFrame, fps, config });
  };
}

/**
 * 把一段文本按术语切分为 [普通文本 | 命中片段] 序列。
 * 规则确定：长术语优先、不重叠、先到先得 —— 同一输入永远同一结果。
 */
function segmentText(text: string, terms: readonly string[]): TextSegment[] {
  const sorted = terms
    .map((term, order) => ({ term, order }))
    .filter((entry) => entry.term.length > 0)
    .sort((a, b) => b.term.length - a.term.length || a.order - b.order);

  const hits: TermHit[] = [];
  for (const { term, order } of sorted) {
    let from = 0;
    let index = text.indexOf(term, from);
    while (index !== -1) {
      const candidate: TermHit = {
        term,
        order,
        start: index,
        end: index + term.length,
      };
      const overlaps = hits.some(
        (hit) => candidate.start < hit.end && candidate.end > hit.start,
      );
      if (!overlaps) hits.push(candidate);
      from = index + 1;
      index = text.indexOf(term, from);
    }
  }
  hits.sort((a, b) => a.start - b.start);

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start > cursor) {
      segments.push({ text: text.slice(cursor, hit.start), hit: null });
    }
    segments.push({ text: text.slice(hit.start, hit.end), hit });
    cursor = hit.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), hit: null });
  }
  return segments;
}

/** 术语脉冲：以 pulseFrames 为周期的三角波 0→1→0，纯 interpolate、无随机 */
function pulseWave(localFrame: number, phase: number, pulseFrames: number): number {
  if (localFrame <= 0) return 0;
  const span = Math.max(1, pulseFrames);
  const shifted = (localFrame + phase) % span;
  return interpolate(
    shifted,
    [0, span * 0.25, span * 0.75, span],
    [0, 1, 0, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
}

export const ConceptScene: FC<ConceptSceneProps> = ({
  title,
  content,
  keyTerms,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = usePrefersReducedMotion();
  const progress = useStageProgress();

  // 每段正文的切分结果：内容/术语不变则不重算（帧循环里保持纯渲染）
  const paragraphs = useMemo(
    () => content.map((text) => segmentText(text, keyTerms)),
    [content, keyTerms],
  );

  // 标题 spring 入场
  const titleSpring = progress(T.titleIn, SPRING.title);
  const titleY = reduced ? 0 : interpolate(titleSpring, [0, 1], [44, 0], {
    extrapolateRight: "clamp",
  });
  const titleOpacity = reduced ? 1 : Math.min(1, titleSpring);

  // 强调色横杠：从左向右展开
  const ruleSpring = progress(T.ruleIn, SPRING.soft);
  const ruleScaleX = reduced ? 1 : interpolate(ruleSpring, [0, 1], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper }}>
      {/* 安全区 padding 必须放在这一层：内层 AbsoluteFill 是 absolute inset:0，
          会无视父级的 padding 直接铺满画布（曾导致内容顶边裁切） */}
      <AbsoluteFill
        style={{
          ...sceneFrameStyle,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          overflow: "hidden",
        }}
      >
        {/* 标题区 */}
        <header style={{ flexShrink: 0 }}>
          <p
            style={{
              margin: 0,
              fontFamily: F.zhSans,
              fontSize: 28,
              letterSpacing: "0.42em",
              color: C.gray,
              opacity: titleOpacity,
            }}
          >
            概念场景 · CONCEPT
          </p>
          <h1
            style={{
              margin: "18px 0 0",
              fontFamily: F.zhBlack,
              fontSize: 72,
              lineHeight: 1.2,
              letterSpacing: "0.01em",
              color: C.ink,
              transform: `translateY(${titleY}px)`,
              opacity: titleOpacity,
            }}
          >
            {title}
          </h1>
          <div
            style={{
              width: CONTENT_WIDTH * 0.24,
              height: 8,
              marginTop: 30,
              borderRadius: 4,
              backgroundColor: accent,
              transform: `scaleX(${ruleScaleX})`,
              transformOrigin: "left center",
            }}
          />
        </header>

        {/* 正文区：逐段 fade */}
        <main
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 40,
            overflow: "hidden",
            marginTop: 56,
          }}
        >
          {paragraphs.map((segments, paragraphIndex) => {
            const enterAt = T.bodyIn + paragraphIndex * T.bodyStagger;
            const enter = progress(enterAt, SPRING.soft);
            const opacity = reduced ? 1 : interpolate(enter, [0, 1], [0, 1], {
              extrapolateRight: "clamp",
            });
            const translateY = reduced
              ? 0
              : interpolate(enter, [0, 1], [26, 0], { extrapolateRight: "clamp" });

            return (
              <p
                key={paragraphIndex}
                style={{
                  margin: 0,
                  fontFamily: F.zhSerif,
                  fontSize: 40,
                  lineHeight: 1.78,
                  color: C.ink,
                  opacity,
                  transform: `translateY(${translateY}px)`,
                }}
              >
                {segments.map((segment, segmentIndex) => {
                  if (!segment.hit) {
                    return <span key={segmentIndex}>{segment.text}</span>;
                  }

                  // 术语高亮脉冲：术语序决定节拍，段落入场晚则以段落为准（术语不抢跑）
                  const localFrame =
                    frame -
                    Math.max(
                      T.termIn + segment.hit.order * T.termStagger,
                      enterAt + 8,
                    );
                  const bloom = reduced
                    ? 1
                    : spring({ frame: localFrame, fps, config: SPRING.term });
                  const wave = reduced ? 0.5 : pulseWave(localFrame, segment.hit.order * 7, T.pulseFrames);
                  const glow = Math.min(1, bloom); // 0→1 快速点亮
                  const bgAlpha = 0.08 + glow * 0.14 + wave * 0.08 * glow;
                  const underlineAlpha = 0.25 + glow * 0.45 + wave * 0.2 * glow;

                  return (
                    <span
                      key={segmentIndex}
                      style={{
                        color: accent,
                        fontFamily: F.zhSerifSemi,
                        backgroundColor: withAlpha(accent, bgAlpha),
                        borderRadius: 6,
                        padding: "2px 6px",
                        margin: "0 2px",
                        boxShadow: `inset 0 -3px 0 ${withAlpha(accent, underlineAlpha)}`,
                      }}
                    >
                      {segment.text}
                    </span>
                  );
                })}
              </p>
            );
          })}
        </main>

        {/* 术语条：keyTerms 逐个弹出，保证未在正文出现的术语也可见 */}
        {keyTerms.length > 0 && (
          <footer
            style={{
              flexShrink: 0,
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              paddingTop: 40,
              borderTop: `2px solid ${C.line}`,
            }}
          >
            {keyTerms.map((term, termIndex) => {
              const chipSpring = progress(
                T.termIn + termIndex * T.termStagger,
                SPRING.term,
              );
              const scale = reduced ? 1 : interpolate(chipSpring, [0, 1], [0.86, 1], {
                extrapolateRight: "clamp",
              });
              const opacity = reduced ? 1 : Math.min(1, chipSpring);

              return (
                <span
                  key={`${term}-${termIndex}`}
                  style={{
                    fontFamily: F.zhSans,
                    fontSize: 32,
                    lineHeight: 1,
                    color: accent,
                    backgroundColor: withAlpha(accent, 0.12),
                    border: `2px solid ${withAlpha(accent, 0.35)}`,
                    borderRadius: 999,
                    padding: "14px 26px",
                    transform: `scale(${scale})`,
                    opacity,
                  }}
                >
                  {term}
                </span>
              );
            })}
          </footer>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
