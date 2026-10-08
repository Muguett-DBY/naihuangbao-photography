import { useMemo, type FC } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ClassroomSceneType } from "../../lib/law-classroom";
import type { LawSubjectId } from "../../types/law";
import {
  SceneChrome,
  useBounceIn,
  usePrefersReducedMotion,
  useStageProgress,
  useStamp,
} from "../chrome";
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
 * 概念场景（图解版）：标题衬线大字 spring 入场 → 正文改造为「要点卡片」
 * 逐张弹入（卡片=术语加粗+短句，左侧学科色书脊）→ 关键术语命中处学科色
 * 下划线脉冲（逻辑保留）→ 底部术语条升级为胶囊逐个「盖章」弹出
 * （有释义数据时升级为两行术语卡）。
 *
 * 动画全部走 chrome.tsx 的帧驱动 helpers（useStageProgress/useBounceIn/
 * useStamp：useCurrentFrame + interpolate/spring，无 Math.random，同帧必然
 * 同画面）；reduced-motion 时全部定格终态。SceneChrome 包壳提供类型徽标、
 * 学科色淡晕与课程进度点（进度点需 sceneTotal 接线后出现）。
 */

export interface ConceptSceneProps {
  /** 场景主标题（如"犯罪构成的四要件装配"） */
  title: string;
  /** 正文段落，每段一张要点卡片 */
  content: readonly string[];
  /** 关键术语：正文中出现处高亮脉冲 + 底部术语胶囊逐个盖章弹出 */
  keyTerms: readonly string[];
  /** 本场景强调色（学科色，见 theme.ts 的 SUBJECT_ACCENTS；alert 场为 C.err） */
  accent: string;
  /** 学科（SceneChrome 淡晕兜底色；accent 已覆盖时仅作语义标注） */
  subject?: LawSubjectId;
  /** 第几场（0-based，SceneChrome 进度点用；未接线时不显示进度点） */
  sceneIndex?: number;
  /** 共几场（SceneChrome 进度点用） */
  sceneTotal?: number;
  /** 术语释义（与 keyTerms 按下标对齐）：有值时底部升级为两行术语卡 */
  keyTermNotes?: readonly (string | undefined)[];
  /** 场景种类：alert（例外警示）时徽标/淡晕走警示语义 */
  sceneKind?: "concept" | "alert";
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

/** 顶部徽标（chrome）下缘 ≈ SAFE.top+66，标题再往下让 84px 起步，永不打架 */
const HEADER_CLEAR = 84;

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

/** 按最长段落字数自适应卡片字号（确定性，防长文撑爆画布） */
function bodyFontSizeFor(content: readonly string[]): number {
  const longest = content.reduce((max, text) => Math.max(max, text.length), 0);
  if (longest > 150) return 30;
  if (longest > 96) return 34;
  return 38;
}

/** 要点卡片：整卡 bounce 弹入；卡内术语命中处学科色下划线脉冲（逻辑保留） */
const PointCard: FC<{
  enterAt: number;
  accent: string;
  fontSize: number;
  segments: readonly TextSegment[];
}> = ({ enterAt, accent, fontSize, segments }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reduced = usePrefersReducedMotion();
  const enter = useBounceIn(enterAt, { distance: 30, scaleFrom: 0.94 });

  return (
    <section
      style={{
        backgroundColor: C.surface,
        border: `2px solid ${C.line}`,
        borderLeft: `8px solid ${withAlpha(accent, 0.55)}`,
        borderRadius: 22,
        padding: "26px 34px",
        boxShadow: "0 12px 32px rgba(50, 42, 40, 0.05)",
        opacity: enter.opacity,
        transform: `translateY(${enter.y}px) scale(${enter.scale})`,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: F.zhSerif,
          fontSize,
          lineHeight: 1.72,
          color: C.ink,
        }}
      >
        {segments.map((segment, segmentIndex) => {
          if (!segment.hit) {
            return <span key={segmentIndex}>{segment.text}</span>;
          }

          // 术语高亮脉冲：术语序决定节拍，卡片入场晚则以卡片为准（术语不抢跑）
          const localFrame =
            frame -
            Math.max(T.termIn + segment.hit.order * T.termStagger, enterAt + 8);
          const bloom = reduced
            ? 1
            : spring({ frame: localFrame, fps, config: SPRING.term });
          const wave = reduced
            ? 0.5
            : pulseWave(localFrame, segment.hit.order * 7, T.pulseFrames);
          const glow = Math.min(1, bloom); // 0→1 快速点亮
          const bgAlpha = 0.08 + glow * 0.14 + wave * 0.08 * glow;
          const underlineAlpha = 0.25 + glow * 0.45 + wave * 0.2 * glow;

          return (
            <span
              key={segmentIndex}
              style={{
                color: accent,
                fontFamily: F.zhSerifSemi,
                fontWeight: 700,
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
    </section>
  );
};

/** 底部术语：胶囊盖章弹出；带释义时升级为「术语加粗 + 释义两行」术语卡 */
const TermChip: FC<{
  term: string;
  note?: string;
  enterAt: number;
  accent: string;
}> = ({ term, note, enterAt, accent }) => {
  const stamp = useStamp(enterAt, { rotate: -6 });

  if (note) {
    return (
      <div
        style={{
          maxWidth: 300,
          backgroundColor: C.surface,
          border: `2px solid ${withAlpha(accent, 0.4)}`,
          borderRadius: 18,
          padding: "14px 22px",
          opacity: stamp.opacity,
          transform: `scale(${stamp.scale}) rotate(${stamp.rotate}deg)`,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: F.zhSans,
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.2,
            color: accent,
          }}
        >
          {term}
        </p>
        <p
          style={{
            margin: "6px 0 0",
            fontFamily: F.zhSans,
            fontSize: 22,
            lineHeight: 1.45,
            color: C.gray,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
          }}
        >
          {note}
        </p>
      </div>
    );
  }

  return (
    <span
      style={{
        fontFamily: F.zhSans,
        fontSize: 30,
        lineHeight: 1,
        fontWeight: 600,
        color: accent,
        backgroundColor: withAlpha(accent, 0.12),
        border: `2px solid ${withAlpha(accent, 0.35)}`,
        borderRadius: 999,
        padding: "14px 26px",
        opacity: stamp.opacity,
        transform: `scale(${stamp.scale}) rotate(${stamp.rotate}deg)`,
      }}
    >
      {term}
    </span>
  );
};

export const ConceptScene: FC<ConceptSceneProps> = ({
  title,
  content,
  keyTerms,
  accent,
  subject,
  sceneIndex,
  sceneTotal,
  keyTermNotes,
  sceneKind = "concept",
}) => {
  const progress = useStageProgress();

  // 每段正文的切分结果：内容/术语不变则不重算（帧循环里保持纯渲染）
  const paragraphs = useMemo(
    () => content.map((text) => segmentText(text, keyTerms)),
    [content, keyTerms],
  );
  const bodyFontSize = useMemo(() => bodyFontSizeFor(content), [content]);

  // 标题 spring 入场 + 强调色横杠从左向右展开（reduced 时 helper 定格终态）
  const titleSpring = progress(T.titleIn, SPRING.title);
  const titleY = interpolate(titleSpring, [0, 1], [44, 0], {
    extrapolateRight: "clamp",
  });
  const titleOpacity = Math.min(1, titleSpring);
  const ruleScaleX = progress(T.ruleIn, SPRING.soft);

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
        {/* 标题区：衬线大字保留；类型小字删掉（SceneChrome 徽标已承载类型语义） */}
        <header style={{ flexShrink: 0, marginTop: HEADER_CLEAR }}>
          <h1
            style={{
              margin: 0,
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

        {/* 要点卡片：逐张弹入（每张卡片=术语加粗+短句，左缘学科色书脊） */}
        <main
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 24,
            overflow: "hidden",
            marginTop: 44,
          }}
        >
          {paragraphs.map((segments, paragraphIndex) => (
            <PointCard
              key={paragraphIndex}
              enterAt={T.bodyIn + paragraphIndex * T.bodyStagger}
              accent={accent}
              fontSize={bodyFontSize}
              segments={segments}
            />
          ))}
        </main>

        {/* 术语条：胶囊逐个盖章弹出（保证未在正文出现的术语也可见） */}
        {keyTerms.length > 0 && (
          <footer
            style={{
              flexShrink: 0,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 16,
              paddingTop: 34,
              borderTop: `2px solid ${C.line}`,
            }}
          >
            {keyTerms.map((term, termIndex) => (
              <TermChip
                key={`${term}-${termIndex}`}
                term={term}
                note={keyTermNotes?.[termIndex]}
                enterAt={T.termIn + termIndex * T.termStagger}
                accent={accent}
              />
            ))}
          </footer>
        )}
      </AbsoluteFill>

      {/* 视觉底座叠加层：类型徽标 + 学科色淡晕 + 课程进度点（与内容层同级） */}
      <SceneChrome
        type={sceneKind === "alert" ? "alert" : "concept"}
        subject={subject ?? "falixue"}
        accent={accent}
        index={sceneIndex ?? 0}
        total={sceneTotal ?? 0}
      />
    </AbsoluteFill>
  );
};
