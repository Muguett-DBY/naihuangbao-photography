import { type FC } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { ClassroomSceneType } from "../../lib/law-classroom";
import type { LawSubjectId } from "../../types/law";
import {
  SceneChrome,
  useBounceIn,
  usePrefersReducedMotion,
  useQBounceIn,
  useStageProgress,
  useStamp,
} from "../chrome";
import { StepMark } from "../step-mark";
import {
  C,
  F,
  RADIUS,
  SHADOW,
  SPRING,
  SUBJECT_ACCENTS,
  T,
  sceneFrameStyle,
  withAlpha,
} from "../theme";

/**
 * 列举场景（可爱化）：标题 + 粉彩→强调墨渐变胶囊横杠 → 列表容器整体轻微
 * 上移入场 → 条目改编号徽章卡片：序号改「糖果色圆片」（五科粉彩轮换：
 * 粉彩底 + 对应 ink 数字，对比度红线内）盖章砸落 + 卡片内容粉彩圆角卡
 * Q 弹入场，左侧引导竖线随条目生长（时间轴导轨质感）；checklist/quiz
 * 变体以 step-mark 的 StepMark（✓ 描边 / ？徽章）替代糖果圆片。
 *
 * 糖果轮换是确定性的（下标 % 5，无随机），全部取自 theme 有限调色板。
 * 全部走 chrome.tsx 帧驱动 helpers（useCurrentFrame + interpolate/spring，
 * 无 Math.random）；reduced-motion 时定格终态；配色统一走 theme
 * （C/F/RADIUS/SHADOW/SUBJECT_ACCENTS/sceneFrameStyle）。SceneChrome 包壳。
 */

export interface ListSceneProps {
  title: string;
  items: string[];
  /** 强调色（标题横杠 / 引导竖线 / StepMark），缺省取学科色 token */
  accent?: string;
  /** 学科（SceneChrome 淡晕兜底色；条目卡粉彩描边优先用学科粉彩 token） */
  subject?: LawSubjectId;
  /** 第几场（0-based，SceneChrome 进度点用；未接线时不显示进度点） */
  sceneIndex?: number;
  /** 共几场（SceneChrome 进度点用） */
  sceneTotal?: number;
  /** 条目前缀样式：list=糖果圆片（默认）；checklist=✓ 描边；quiz=？徽章 */
  variant?: "list" | "checklist" | "quiz";
}

const ITEM_STAGGER_FRAMES = 4;
/** 糖果圆片直径（px，1080×1920 基准） */
const DISC = 52;
/** 顶部徽标（chrome）下缘的让位高度 */
const HEADER_CLEAR = 84;

/**
 * 糖果轮换：五科 { pastel, ink } 按条目下标轮着戴——粉彩糖纸底 + 对应
 * ink 数字（token 声明双底 ≥5.54:1），顺序写死保证确定性。
 */
const CANDY: ReadonlyArray<{ pastel: string; ink: string }> = [
  SUBJECT_ACCENTS.falixue,
  SUBJECT_ACCENTS.xianfa,
  SUBJECT_ACCENTS.zhishixiang,
  SUBJECT_ACCENTS.minfa,
  SUBJECT_ACCENTS.xingfa,
];

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

/** 编号徽章条目：糖果圆片盖章砸落 + 粉彩圆角卡 Q 弹入场（checklist/quiz 用 StepMark） */
const ListRow: FC<{
  item: string;
  index: number;
  enterAt: number;
  accent: string;
  pastel: string | null;
  fontSize: number;
  clampLines?: number;
  mark: "checklist" | "quiz" | null;
}> = ({ item, index, enterAt, accent, pastel, fontSize, clampLines, mark }) => {
  const stamp = useStamp(enterAt, { rotate: -8, scaleFrom: 1.5 });
  const pop = useQBounceIn(enterAt + 4, { distance: 20, scaleFrom: 0.95, overshootPx: 4 });
  const candy = CANDY[index % CANDY.length];

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
        <StepMark kind={mark} accent={accent} enterAt={enterAt} size={DISC} />
      ) : (
        <span
          aria-hidden="true"
          style={{
            flex: "none",
            width: DISC,
            height: DISC,
            borderRadius: "50%",
            backgroundColor: candy.pastel,
            color: candy.ink,
            border: `2.5px solid ${withAlpha(candy.ink, 0.2)}`,
            fontFamily: F.zhSans,
            fontSize: 26,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: SHADOW.soft,
            opacity: stamp.opacity,
            transform: `scale(${stamp.scale}) rotate(${stamp.rotate}deg)`,
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
          border: `2.5px solid ${pastel ?? withAlpha(accent, 0.2)}`,
          borderRadius: RADIUS.inner,
          padding: "18px 30px",
          boxShadow: SHADOW.soft,
          fontFamily: F.zhSerif,
          fontSize,
          lineHeight: 1.55,
          color: C.ink,
          opacity: pop.opacity,
          transform: `translateY(${pop.y}px) scale(${pop.scale})`,
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
  accent = SUBJECT_ACCENTS.falixue.accent,
  subject,
  sceneIndex,
  sceneTotal,
  variant = "list",
}: ListSceneProps) {
  const frame = useCurrentFrame();
  const reduced = usePrefersReducedMotion();
  /** 学科粉彩（真 token 或 null → 条目卡描边走 accent 自混兜底） */
  const pastel = subject ? SUBJECT_ACCENTS[subject].pastel : null;

  // 标题 bounce + 粉彩→强调墨渐变胶囊横杠展开；列表容器整体轻微上移入场
  const titleEnter = useBounceIn(T.titleIn, { distance: 26 });
  const containerEnter = useBounceIn(T.bodyIn, { distance: 24, scaleFrom: 0.985 });
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
    <AbsoluteFill style={{ backgroundColor: C.paper }}>
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
              height: 8,
              marginTop: 24,
              borderRadius: RADIUS.pill,
              background: `linear-gradient(90deg, ${pastel ?? withAlpha(accent, 0.2)}, ${accent})`,
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
            {/* 左侧引导竖线：随条目生长 */}
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
                  backgroundColor: withAlpha(accent, 0.28),
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
                  accent={accent}
                  pastel={pastel}
                  fontSize={itemFontSize(item.length, items.length)}
                  clampLines={clampFor(item)}
                  mark={mark}
                />
              ))}
            </ul>
          </div>
        </div>
      </AbsoluteFill>

      {/* 视觉底座叠加层：类型徽标 + 学科色淡晕 + 课程进度点 */}
      <SceneChrome
        type={CHROME_TYPE_BY_VARIANT[variant]}
        subject={subject ?? "falixue"}
        accent={accent}
        index={sceneIndex ?? 0}
        total={sceneTotal ?? 0}
      />
    </AbsoluteFill>
  );
}
