import { useMemo, type FC } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { LawSubjectId } from "../../types/law";
import {
  SceneChrome,
  usePrefersReducedMotion,
  useRiseIn,
  useStamp,
  useStageProgress,
} from "../chrome";
import { C, CONTENT_WIDTH, F, RADIUS, SPRING, T, sceneFrameStyle } from "../theme";

/**
 * 概念场景（Apple 黑白灰）：标题大字（无衬线 700）缓入 → 要点卡片为白卡 +
 * 发丝线描边（200-300ms ease-out 上浮入场，无过冲）→ 关键术语命中处改
 * 「苹果蓝下划线」（一次性缓出点亮，替代可爱期的粉彩胶囊荧光笔与脉冲循环）
 * → 底部术语条灰阶胶囊逐个落位（有释义数据时升级为两行术语卡）。
 *
 * 动画全部走 chrome.tsx 的帧驱动 helpers（useCurrentFrame + interpolate，
 * 无 Math.random，同帧必然同画面）；reduced-motion 时全部定格终态。
 * SceneChrome 包壳提供类型徽标、进度点（学科锚点）。accent prop 承载唯一
 * 语义：alert 场由 SceneView 传 C.err（语义红只落在横杠与徽标，其余不随
 * 学科变色——彩色预算：锚点只进进度）。
 */

export interface ConceptSceneProps {
  /** 场景主标题（如"犯罪构成的四要件装配"） */
  title: string;
  /** 正文段落，每段一张要点卡片 */
  content: readonly string[];
  /** 关键术语：正文中出现处画蓝下划线 + 底部术语胶囊逐个落位 */
  keyTerms: readonly string[];
  /** 兼容接线（SceneView 恒传）：仅当值为 C.err（alert 场）时触发语义红横杠/徽标 */
  accent: string;
  /** 学科（SceneChrome 进度点锚点色） */
  subject?: LawSubjectId;
  /** 第几场（0-based，SceneChrome 进度点用；未接线时不显示进度点） */
  sceneIndex?: number;
  /** 共几场（SceneChrome 进度点用） */
  sceneTotal?: number;
  /** 术语释义（与 keyTerms 按下标对齐）：有值时底部升级为两行术语卡 */
  keyTermNotes?: readonly (string | undefined)[];
  /** 场景种类：alert（例外警示）时徽标走语义红、标题横杠红 */
  sceneKind?: "concept" | "alert";
}

/** 术语命中：在正文里的一次出现（起止偏移为该段文本内的下标） */
interface TermHit {
  term: string;
  /** 该术语在 keyTerms 里的序号，决定下划线起跳帧 */
  order: number;
  start: number;
  end: number;
}

/** 正文切分结果：命中片段（蓝下划线）与普通文本相间 */
interface TextSegment {
  text: string;
  hit: TermHit | null;
}

/** 顶部徽标（chrome）下缘 ≈ SAFE.top+66，标题再往下让 84px 起步，永不打架 */
const HEADER_CLEAR = 84;

/** 术语蓝下划线的缓出点亮时长（帧，30fps 下 ≈233ms） */
const TERM_BLOOM_FRAMES = 7;

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

/** 按最长段落字数自适应卡片字号（确定性，防长文撑爆画布） */
function bodyFontSizeFor(content: readonly string[]): number {
  const longest = content.reduce((max, text) => Math.max(max, text.length), 0);
  if (longest > 150) return 30;
  if (longest > 96) return 34;
  return 38;
}

/** 要点卡片：白卡 + 发丝线描边，缓出上浮入场；卡内术语命中处苹果蓝下划线（一次性点亮） */
const PointCard: FC<{
  enterAt: number;
  fontSize: number;
  segments: readonly TextSegment[];
}> = ({ enterAt, fontSize, segments }) => {
  const frame = useCurrentFrame();
  const reduced = usePrefersReducedMotion();
  const enter = useRiseIn(enterAt, { distance: 22 });

  return (
    <section
      style={{
        backgroundColor: C.surface,
        border: `2px solid ${C.line}`,
        borderRadius: RADIUS.card,
        padding: "26px 34px",
        opacity: enter.opacity,
        transform: `translateY(${enter.y}px)`,
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

          // 术语苹果蓝下划线：一次性缓出点亮（bloom 0→1），无持续循环；
          // 文字保持墨色 + 600 字重（层级靠字重，蓝只作下划线图形）
          const localFrame =
            frame -
            Math.max(T.termIn + segment.hit.order * T.termStagger, enterAt + 8);
          const bloom = reduced
            ? 1
            : interpolate(
                localFrame,
                [0, TERM_BLOOM_FRAMES],
                [0, 1],
                {
                  easing: Easing.out(Easing.cubic),
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              );

          return (
            <span
              key={segmentIndex}
              style={{
                color: C.ink,
                fontFamily: F.zhSerifSemi,
                fontWeight: 600,
                padding: "0 2px",
                backgroundImage: `linear-gradient(${C.blue}, ${C.blue})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "0 100%",
                backgroundSize: `${Math.max(0.001, bloom) * 100}% 4px`,
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

/** 底部术语：灰阶胶囊落位；带释义时升级为「术语加粗 + 释义两行」术语卡 */
const TermChip: FC<{
  term: string;
  note?: string;
  enterAt: number;
}> = ({ term, note, enterAt }) => {
  const stamp = useStamp(enterAt);

  if (note) {
    return (
      <div
        style={{
          maxWidth: 300,
          backgroundColor: C.surface,
          border: `2px solid ${C.line}`,
          borderRadius: RADIUS.control,
          padding: "14px 22px",
          opacity: stamp.opacity,
          transform: `scale(${stamp.scale})`,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: F.zhSans,
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.2,
            color: C.ink,
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
        color: C.ink,
        backgroundColor: C.paper,
        borderRadius: RADIUS.pill,
        padding: "14px 26px",
        opacity: stamp.opacity,
        transform: `scale(${stamp.scale})`,
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

  // 标题缓入 + 墨色横杠从左向右展开（alert 场横杠走语义红）；reduced 时定格终态
  const titleProgress = progress(T.titleIn, SPRING.title);
  const titleY = interpolate(titleProgress, [0, 1], [32, 0], {
    extrapolateRight: "clamp",
  });
  const titleOpacity = Math.min(1, titleProgress);
  const ruleScaleX = progress(T.ruleIn, SPRING.soft);
  /** 例外警示：显式 sceneKind，或 SceneView 的既有接线（alert 场 accent=C.err）。
   *  语义红只落在横杠与 chrome 徽标（红仅错误/警示），正文墨色不变 */
  const isAlert = sceneKind === "alert" || accent === C.err;
  const ruleColor = isAlert ? C.err : C.ink;

  return (
    <AbsoluteFill style={{ backgroundColor: C.surface }}>
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
        {/* 标题区：无衬线大字 + 字重定层级。布局容器一律用 div：课堂 Player 会把
            场景渲染进页面 DOM，header/main/footer 会产出无标签 landmark + 嵌套
            第二个 main，污染读屏的 landmark 导航（WCAG 1.3.1） */}
        <div style={{ flexShrink: 0, marginTop: HEADER_CLEAR }}>
          <h1
            style={{
              margin: 0,
              fontFamily: F.zhBlack,
              fontWeight: 700,
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
              height: 6,
              marginTop: 30,
              borderRadius: RADIUS.pill,
              backgroundColor: ruleColor,
              transform: `scaleX(${ruleScaleX})`,
              transformOrigin: "left center",
            }}
          />
        </div>

        {/* 要点卡片：白卡 + 发丝线逐张缓出入场（每张卡=蓝下划线术语+短句） */}
        <div
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
              fontSize={bodyFontSize}
              segments={segments}
            />
          ))}
        </div>

        {/* 术语条：灰阶胶囊逐个落位（保证未在正文出现的术语也可见）；
            上缘发丝线仅作内容/术语分组（列表分组专用口径） */}
        {keyTerms.length > 0 && (
          <div
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
              />
            ))}
          </div>
        )}
      </AbsoluteFill>

      {/* 视觉底座叠加层：类型徽标（alert 走语义红徽标）+ 课程进度点（与内容层同级） */}
      <SceneChrome
        type={isAlert ? "alert" : "concept"}
        subject={subject ?? "falixue"}
        index={sceneIndex ?? 0}
        total={sceneTotal ?? 0}
      />
    </AbsoluteFill>
  );
};
