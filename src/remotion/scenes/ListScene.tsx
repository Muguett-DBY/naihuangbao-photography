import { type FC } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { ClassroomSceneType } from "../../lib/law-classroom";
import type { LawSubjectId } from "../../types/law";
import {
  SceneChrome,
  useBounceIn,
  usePrefersReducedMotion,
  useRiseIn,
  useStageProgress,
  useStamp,
} from "../chrome";
import { StepMark } from "../step-mark";
import { C, F, RADIUS, SPRING, T, sceneFrameStyle } from "../theme";

/**
 * 列举场景（Apple 黑白灰）：标题 + 墨色横杠 → 列表容器整体轻微上移入场 →
 * 条目为「序号灰阶圆片（浅灰底 + 墨色数字）+ 白卡发丝线条目卡」缓出落位，
 * 左侧引导竖线随条目生长（时间轴导轨质感）；checklist/quiz 变体以 step-mark
 * 的 StepMark（✓ 描边 / ？徽章，墨色单色）替代序号圆片。
 *
 * 全部走 chrome.tsx 帧驱动 helpers（useCurrentFrame + interpolate/spring，
 * 无 Math.random）；reduced-motion 时定格终态；配色统一走 theme
 * （C/F/RADIUS/sceneFrameStyle）。SceneChrome 包壳（徽标 + 学科锚点进度点）。
 * accent prop 仅为 SceneView 既有接线保留，画面不再随学科变色。
 */

export interface ListSceneProps {
  title: string;
  items: string[];
  /** 兼容接线（SceneView 恒传）：Apple 化后画面不随此值变色 */
  accent?: string;
  /** 学科（SceneChrome 进度点锚点色） */
  subject?: LawSubjectId;
  /** 第几场（0-based，SceneChrome 进度点用；未接线时不显示进度点） */
  sceneIndex?: number;
  /** 共几场（SceneChrome 进度点用） */
  sceneTotal?: number;
  /** 条目前缀样式：list=灰阶圆片（默认）；checklist=✓ 描边；quiz=？徽章 */
  variant?: "list" | "checklist" | "quiz";
}

const ITEM_STAGGER_FRAMES = 4;
/** 序号圆片直径（px，1080×1920 基准） */
const DISC = 52;
/** 顶部徽标（chrome）下缘的让位高度 */
const HEADER_CLEAR = 84;

/** 按字数/条数自适应条目字号（确定性，实拍长条目不再被裁切的第一道闸） */
function itemFontSize(textLength: number, itemCount: number): number {
  let size = 38;
  if (textLength > 18) size = 34;
  if (textLength > 30) size = 30;
  if (textLength > 46) size = 27;
  if (itemCount > 7) size = Math.min(size, 30);
  if (itemCount > 10) size = Math.min(size, 27);
  return size;
}

const MARK_BY_VARIANT: Partial<Record<"list" | "checklist" | "quiz", "checklist" | "quiz">> = {
  checklist: "checklist",
  quiz: "quiz",
};

const CHROME_TYPE_BY_VARIANT: Record<"list" | "checklist" | "quiz", ClassroomSceneType> = {
  list: "list",
  checklist: "checklist",
  quiz: "quiz",
};

/** 编号徽章条目：灰阶圆片落位 + 白卡发丝线条目卡缓出（checklist/quiz 用墨色 StepMark） */
const ListRow: FC<{
  item: string;
  index: number;
  enterAt: number;
  fontSize: number;
  clampLines?: number;
  mark: "checklist" | "quiz" | null;
}> = ({ item, index, enterAt, fontSize, clampLines, mark }) => {
  const stamp = useStamp(enterAt);
  const pop = useRiseIn(enterAt + 4, { distance: 16 });

  return (
    <li
      style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        alignItems: "flex-start",
        gap: 22,
        minHeight: DISC,
      }}
    >
      {mark ? (
        <StepMark kind={mark} accent={C.ink} enterAt={enterAt} size={DISC} />
      ) : (
        <span
          aria-hidden="true"
          style={{
            flex: "none",
            width: DISC,
            height: DISC,
            borderRadius: "50%",
            backgroundColor: C.paper,
            color: C.ink,
            fontFamily: F.enSerif,
            fontSize: 26,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: stamp.opacity,
            transform: `scale(${stamp.scale})`,
          }}
        >
          {index + 1}
        </span>
      )}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          backgroundColor: C.surface,
          border: `2px solid ${C.line}`,
          borderRadius: RADIUS.inner,
          padding: "18px 30px",
          fontFamily: F.zhSerif,
          fontSize,
          lineHeight: 1.55,
          color: C.ink,
          opacity: pop.opacity,
          transform: `translateY(${pop.y}px)`,
          ...(clampLines
            ? {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: clampLines,
                overflow: "hidden",
              }
            : {}),
        }}
      >
        {item}
      </span>
    </li>
  );
};

export function ListScene({
  title,
  items,
  subject,
  sceneIndex,
  sceneTotal,
  variant = "list",
}: ListSceneProps) {
  const frame = useCurrentFrame();
  const reduced = usePrefersReducedMotion();

  // 标题缓入 + 墨色横杠展开；列表容器整体轻微上移入场
  const titleEnter = useBounceIn(T.titleIn, { distance: 20 });
  const containerEnter = useBounceIn(T.bodyIn, { distance: 18, scaleFrom: 0.99 });
  const ruleScaleX = useStageProgress()(T.ruleIn, SPRING.soft);

  // 引导竖线：随条目逐个入场从上往下生长（时间轴导轨）
  const spineStart = T.bodyIn + 8;
  const spineEnd = spineStart + Math.max(0, items.length - 1) * ITEM_STAGGER_FRAMES + 12;
  const spine = reduced
    ? 1
    : interpolate(frame, [spineStart, spineEnd], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  // 溢出保护：长条目截断加省略（第二道闸，配合上面的自适应字号）
  const clampFor = (text: string): number | undefined =>
    text.length > 92 ? 3 : undefined;

  const mark = MARK_BY_VARIANT[variant] ?? null;

  return (
    <AbsoluteFill style={{ backgroundColor: C.surface }}>
      <AbsoluteFill
        style={{
          ...sceneFrameStyle,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 布局容器用 div：课堂 Player 会把场景渲染进页面 DOM，header/main 会产出
            无标签 landmark + 嵌套第二个 main，污染读屏的 landmark 导航（WCAG 1.3.1） */}
        <div style={{ flexShrink: 0, marginTop: HEADER_CLEAR }}>
          <h2
            style={{
              margin: 0,
              fontFamily: F.zhBlack,
              fontWeight: 700,
              fontSize: 68,
              lineHeight: 1.22,
              color: C.ink,
              opacity: titleEnter.opacity,
              transform: `translateY(${titleEnter.y}px)`,
            }}
          >
            {title}
          </h2>
          <div
            aria-hidden="true"
            style={{
              width: 190,
              height: 6,
              marginTop: 24,
              borderRadius: RADIUS.pill,
              backgroundColor: C.ink,
              transform: `scaleX(${ruleScaleX})`,
              transformOrigin: "left center",
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            overflow: "hidden",
            marginTop: 40,
            opacity: containerEnter.opacity,
            transform: `translateY(${containerEnter.y}px)`,
          }}
        >
          <div style={{ position: "relative" }}>
            {/* 左侧引导竖线：随条目生长（发丝线，结构性导轨） */}
            {items.length > 1 && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: DISC / 2 - 2,
                  top: DISC / 2,
                  bottom: DISC / 2,
                  width: 4,
                  borderRadius: 999,
                  backgroundColor: C.line,
                  transform: `scaleY(${spine})`,
                  transformOrigin: "top center",
                }}
              />
            )}
            <ul
              style={{
                position: "relative",
                zIndex: 1,
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: items.length > 8 ? 14 : 22,
              }}
            >
              {items.map((item, index) => (
                <ListRow
                  key={`${item}-${index}`}
                  item={item}
                  index={index}
                  enterAt={T.bodyIn + 6 + index * ITEM_STAGGER_FRAMES}
                  fontSize={itemFontSize(item.length, items.length)}
                  clampLines={clampFor(item)}
                  mark={mark}
                />
              ))}
            </ul>
          </div>
        </div>
      </AbsoluteFill>

      {/* 视觉底座叠加层：类型徽标 + 学科锚点进度点 */}
      <SceneChrome
        type={CHROME_TYPE_BY_VARIANT[variant]}
        subject={subject ?? "falixue"}
        index={sceneIndex ?? 0}
        total={sceneTotal ?? 0}
      />
    </AbsoluteFill>
  );
}
