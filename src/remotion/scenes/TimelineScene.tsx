import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { CSSProperties, FC } from "react";
import type { LawSubjectId } from "../../types/law";
import {
  C,
  F,
  RADIUS,
  SAFE,
  SHADOW,
  SPRING,
  SUBJECT_ACCENTS,
  T,
  sceneFrameStyle,
  withAlpha,
} from "../theme";
import {
  SceneChrome,
  strokeDashStyle,
  usePrefersReducedMotion,
  useQBounceIn,
  useStageProgress,
} from "../chrome";

/**
 * TimelineScene — 时间线场景（可爱令牌 · 横轴版）。
 * 标题入场后，横贯安全区的「时间轴」自左向右描边生长：粉彩宽轨（圆头胶囊轨）
 * 垫底 + ink 细线铺成长（stroke-dashoffset 帧驱动），轴尖带高亮光点；
 * 事件糖果圆点沿轴依次弹出，事件卡（年份糖果徽章 + 事件短句）随点上下交替
 * Q 弹展开，末端的箭头在轴线贯通时弹出入位。
 *
 * 年份糖果徽章：粉彩芯胶囊 + ink 描边 + 年份 ink 文楷字（对比度红线）。
 *
 * 动画完全帧驱动（chrome 的 spring helpers + interpolate，无 Math.random）；
 * prefers-reduced-motion 时全部定格终态。
 */

export interface TimelineEvent {
  time: string;
  event: string;
}

export interface TimelineSceneProps {
  title: string;
  events: TimelineEvent[];
  /** 学科强调色（缺省宪法红 = 既有出片；SceneView 接线后走 SUBJECT_ACCENTS）。 */
  accent?: string;
  /** SceneChrome 底座入参：学科 id（accent 恒有值时仅占位）与场次进度。 */
  subject?: LawSubjectId;
  /** 第几场（0-based）；total 为 0 时 chrome 不画进度点。 */
  sceneIndex?: number;
  sceneTotal?: number;
}

/** 时序常量（帧；ClassroomPlayer 经 timelineSceneDurationInFrames 依赖） */
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

/* —— 横轴几何（安区内 930×1486；顶部为 chrome 徽标让出 88px） —— */
const HEADER_H = 168;
const CHROME_TOP_CLEAR = 88;
const AREA_H = 1486 - HEADER_H - CHROME_TOP_CLEAR; // 1230
const AREA_W = 930;
const AXIS_X0 = 24;
const AXIS_X1 = 906;
const AXIS_Y = Math.round(AREA_H * 0.52); // 685：轴心略偏上，给上下事件卡留量
const DOT_R = 12.5;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * 事件卡（可爱令牌）：浮层白卡大圆角 + 粉彩描边 + 软阴影，年份是糖果徽章
 * （粉彩芯胶囊 + ink 细描边 + ink 文楷字）。useQBounceIn 朝轴心方向 Q 弹展开
 * （过冲 ≤5px，朝离开轴的方向轻微过头再回正）。抽成组件以便逐卡持 hook。
 */
const TimelineEventCard: FC<{
  item: TimelineEvent;
  tone: string;
  enterAt: number;
  above: boolean;
  anchorY: number;
  left: number;
  width: number;
  yearFont: number;
  eventFont: number;
}> = ({ item, tone, enterAt, above, anchorY, left, width, yearFont, eventFont }) => {
  const pop = useQBounceIn(enterAt, { distance: 18, scaleFrom: 0.92, overshootPx: 5 });
  // 上卡从轴心上方落回（y 正→0、过冲为负=向上过头），下卡镜像
  const dir = above ? 1 : -1;
  const anchor: CSSProperties = above
    ? { bottom: anchorY }
    : { top: anchorY };
  return (
    <div
      style={{
        position: "absolute",
        left,
        width,
        boxSizing: "border-box",
        padding: "14px 18px",
        background: C.raised,
        borderRadius: RADIUS.inner,
        border: `2.5px solid ${withAlpha(tone, 0.35)}`,
        boxShadow: SHADOW.soft,
        opacity: pop.opacity,
        transform: `translateY(${dir * pop.y}px) scale(${pop.scale})`,
        ...anchor,
      }}
    >
      {/* 年份糖果徽章：粉彩芯胶囊 + ink 细描边 */}
      <div
        style={{
          display: "inline-block",
          padding: "2px 18px",
          borderRadius: RADIUS.pill,
          background: withAlpha(tone, 0.16),
          border: `2px solid ${withAlpha(tone, 0.45)}`,
          fontFamily: F.zhSerifSemi,
          fontSize: yearFont,
          lineHeight: 1.3,
          color: tone,
          letterSpacing: "0.02em",
        }}
      >
        {item.time}
      </div>
      <p
        style={{
          margin: `${Math.round(yearFont * 0.18)}px 0 0`,
          fontFamily: F.zhSerif,
          fontSize: eventFont,
          lineHeight: 1.5,
          color: C.ink,
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 3,
          overflow: "hidden",
        }}
      >
        {item.event}
      </p>
    </div>
  );
};

export const TimelineScene: FC<TimelineSceneProps> = ({
  title,
  events,
  accent = SUBJECT_ACCENTS.xianfa.accent,
  subject,
  sceneIndex = 0,
  sceneTotal = 0,
}) => {
  const frame = useCurrentFrame();
  const reduced = usePrefersReducedMotion();
  const progress = useStageProgress();
  const n = events.length;

  // 标题（theme 帧精确节拍）
  const titleIn = progress(T.titleIn, SPRING.title);
  const titleY = interpolate(titleIn, [0, 1], [40, 0]);
  const ruleIn = progress(T.ruleIn, SPRING.soft);

  // 轴线生长：按事件数匀速铺满（非 spring，保证事件点与轴尖同步律动）
  const axisDuration = axisDurationFor(n);
  const axisProgress = reduced
    ? 1
    : interpolate(frame, [AXIS_START_FRAME, AXIS_START_FRAME + axisDuration], [0, 1], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const tipFade = reduced
    ? 0
    : interpolate(axisProgress, [0.9, 0.99], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const tipX = AXIS_X0 + (AXIS_X1 - AXIS_X0) * axisProgress;

  // 事件卡尺寸按密度自适应
  const slot = n > 0 ? (AXIS_X1 - AXIS_X0) / n : 0;
  const cardW = Math.round(clamp(slot * 1.7, 150, 290));
  const twoTiers = slot > 0 && slot * 2 < 158; // 密到同侧会叠卡时启用上下两层
  const distOf = (index: number): number =>
    twoTiers ? (Math.floor(index / 2) % 2 === 0 ? 46 : 176) : 44;
  const yearFont = n <= 5 ? 46 : n <= 7 ? 40 : 34;
  const eventFont = n <= 5 ? 27 : n <= 7 ? 25 : 22;

  const eventX = (index: number): number => AXIS_X0 + slot * (index + 0.5);
  const appearAt = (index: number): number =>
    AXIS_START_FRAME + ((index + 0.5) / Math.max(1, n)) * axisDuration;
  const endArrow = progress(AXIS_START_FRAME + axisDuration, SPRING.term);

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper }}>
      {/* 内容层：sceneFrameStyle 安全区 padding + chrome 徽标让位 */}
      <AbsoluteFill
        style={{
          ...sceneFrameStyle,
          paddingTop: SAFE.top + CHROME_TOP_CLEAR,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 标题（div：header 在课堂 Player 的页面 DOM 里会产出无标签 landmark，WCAG 1.3.1） */}
        <div style={{ flex: "none", height: HEADER_H, overflow: "hidden" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: F.zhBlack,
              fontSize: 48,
              lineHeight: 1.3,
              letterSpacing: "0.02em",
              color: C.ink,
              opacity: titleIn,
              transform: `translateY(${titleY}px)`,
            }}
          >
            {title}
          </h1>
          {/* 强调杠：粉彩胶囊下划线（可爱令牌——替代重描边式色杠） */}
          <div
            style={{
              width: AREA_W * 0.22,
              height: 10,
              marginTop: 18,
              borderRadius: RADIUS.pill,
              background: withAlpha(accent, 0.32),
              transformOrigin: "left center",
              transform: `scaleX(${ruleIn})`,
            }}
          />
        </div>

        {/* 时间轴区：SVG 轴线/圆点垫底，事件卡绝对定位其上 */}
        {n > 0 && (
          <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
            <svg
              width={AREA_W}
              height={AREA_H}
              viewBox={`0 0 ${AREA_W} ${AREA_H}`}
              style={{ position: "absolute", left: 0, top: 0 }}
              aria-hidden="true"
            >
              {/* 粉彩宽轨（圆头胶囊轨，可爱令牌的时间轴本体） */}
              <path
                d={`M ${AXIS_X0} ${AXIS_Y} L ${AXIS_X1} ${AXIS_Y}`}
                fill="none"
                stroke={withAlpha(accent, 0.2)}
                strokeWidth={16}
                strokeLinecap="round"
              />
              {/* 描边生长：左 → 右（ink 细线铺在粉彩轨上） */}
              <path
                d={`M ${AXIS_X0} ${AXIS_Y} L ${AXIS_X1} ${AXIS_Y}`}
                fill="none"
                stroke={accent}
                strokeWidth={7}
                strokeLinecap="round"
                pathLength={100}
                style={strokeDashStyle(axisProgress)}
              />
              {/* 轴尖高亮光点：生长期间点亮，贯通后淡出 */}
              {tipFade > 0.01 && axisProgress < 0.995 && (
                <g opacity={tipFade}>
                  <circle cx={tipX} cy={AXIS_Y} r={22} fill={withAlpha(accent, 0.25)} />
                  <circle cx={tipX} cy={AXIS_Y} r={9} fill={accent} />
                </g>
              )}
              {/* 末端箭头：轴线贯通时弹出 */}
              <polygon
                points={`${AXIS_X1 + 2},${AXIS_Y} ${AXIS_X1 - 14},${AXIS_Y - 11} ${AXIS_X1 - 14},${AXIS_Y + 11}`}
                fill={accent}
                opacity={Math.min(1, endArrow * 1.5)}
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  transform: `scale(${interpolate(endArrow, [0, 1], [0.3, 1])})`,
                }}
              />

              {/* 事件糖果圆点 + 引线 */}
              {events.map((_, index) => {
                const pop = progress(appearAt(index), SPRING.term);
                const above = index % 2 === 0;
                const dist = distOf(index);
                const x = eventX(index);
                const stubEnd = above ? AXIS_Y - dist + 6 : AXIS_Y + dist - 6;
                const stubStart = above ? AXIS_Y - DOT_R - 4 : AXIS_Y + DOT_R + 4;
                const stub = progress(appearAt(index) + 2, SPRING.soft);
                return (
                  <g key={`dot-${index}`}>
                    <path
                      d={`M ${x} ${stubStart} L ${x} ${stubEnd}`}
                      fill="none"
                      stroke={withAlpha(accent, 0.65)}
                      strokeWidth={3.5}
                      strokeLinecap="round"
                      pathLength={100}
                      style={strokeDashStyle(stub)}
                    />
                    <circle
                      cx={x}
                      cy={AXIS_Y}
                      r={DOT_R}
                      fill={C.raised}
                      stroke={accent}
                      strokeWidth={5}
                      opacity={Math.min(1, pop * 1.6)}
                      style={{
                        transformBox: "fill-box",
                        transformOrigin: "center",
                        transform: `scale(${interpolate(pop, [0, 1], [0.3, 1])})`,
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* 事件卡：年份糖果徽章 + 事件短句，沿轴上下交替 Q 弹展开 */}
            {events.map((item, index) => {
              const above = index % 2 === 0;
              const dist = distOf(index);
              const x = eventX(index);
              const cardLeft = clamp(x - cardW / 2, 0, AREA_W - cardW);
              const anchorY = above ? AREA_H - AXIS_Y + dist : AXIS_Y + dist;
              return (
                <TimelineEventCard
                  key={`${index}-${item.time}`}
                  item={item}
                  tone={accent}
                  enterAt={appearAt(index) + 5}
                  above={above}
                  anchorY={anchorY}
                  left={cardLeft}
                  width={cardW}
                  yearFont={yearFont}
                  eventFont={eventFont}
                />
              );
            })}
          </div>
        )}
      </AbsoluteFill>

      {/* 视觉底座叠加层 */}
      <SceneChrome
        type="timeline"
        subject={subject ?? "falixue"}
        accent={accent}
        index={sceneIndex}
        total={sceneTotal}
      />
    </AbsoluteFill>
  );
};
