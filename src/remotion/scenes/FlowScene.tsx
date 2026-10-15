import { AbsoluteFill, interpolate } from "remotion";
import type { FC } from "react";
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
  useQBounceIn,
  useStageProgress,
} from "../chrome";

/**
 * FlowScene — 流程场景（可爱令牌 · 竖版 S 形折线布局）。
 * 标题先入场，糖果节点卡按序 Q 弹「落地」（useQBounceIn 过冲 ≤6px，过头再回正），
 * 节点之间的 S 形圆头连线以 stroke-dashoffset 帧驱动描边生长（粉彩宽轨垫底、
 * ink 细线铺成长），每段连线甩到位后箭头小三角弹出，呈现「步骤逐级串联展开」。
 *
 * 糖果节点（candy）：白卡软阴影 + 粉彩描边 + 糖果序号章（粉彩芯、ink 描边、
 * 左上高光点——确定性装饰，无随机）。
 *
 * 布局：节点卡片沿竖向蛇形排布（奇偶行左右交错铺满 1080×1920 安全区），
 * 行距/卡高按节点数自适应（取代旧横排的 compact 布尔）。
 *
 * 动画完全帧驱动（chrome 的 spring helpers + interpolate，无 Math.random）；
 * prefers-reduced-motion 时全部定格终态。
 */

export interface FlowSceneProps {
  title: string;
  steps: string[];
  /** 学科强调色（缺省宪法红 = 既有出片；SceneView 接线后走 SUBJECT_ACCENTS）。 */
  accent?: string;
  /** SceneChrome 底座入参：学科 id（accent 恒有值时仅占位）与场次进度。 */
  subject?: LawSubjectId;
  /** 第几场（0-based）；total 为 0 时 chrome 不画进度点。 */
  sceneIndex?: number;
  sceneTotal?: number;
}

/** 时序常量（帧，30fps 基准；ClassroomPlayer 经 flowSceneDurationInFrames 依赖） */
const TITLE_ENTER_FRAMES = 26;
const STEP_STAGGER_FRAMES = 12;
const CONNECTOR_LEAD_FRAMES = 5;
const CONNECTOR_GROW_FRAMES = 14;
const TAIL_HOLD_FRAMES = 36;

/** 该场景完成全部动画（含收尾停留）所需的时长（帧）。 */
export const flowSceneDurationInFrames = (stepCount: number): number => {
  if (stepCount <= 0) return TITLE_ENTER_FRAMES + TAIL_HOLD_FRAMES;
  const lastNode = TITLE_ENTER_FRAMES + (stepCount - 1) * STEP_STAGGER_FRAMES;
  return lastNode + CONNECTOR_GROW_FRAMES + TAIL_HOLD_FRAMES;
};

/* —— 竖版几何（安区内 930×1486；顶部为 chrome 徽标让出 88px） —— */
const HEADER_H = 168; // 标题块固定高
const CHROME_TOP_CLEAR = 88;
const AREA_H = 1486 - HEADER_H - CHROME_TOP_CLEAR; // 节点区可用高 1230
const AREA_W = 930;
const ZIGZAG_OFFSET = 140; // 蛇形交错的中轴偏移

const nodeDelay = (index: number): number =>
  TITLE_ENTER_FRAMES + index * STEP_STAGGER_FRAMES;

/**
 * 糖果节点卡（可爱令牌）：白卡大圆角 + 粉彩描边 + 软阴影，序号是糖果章
 * （粉彩芯 + ink 描边 + 左上白高光点）。useQBounceIn 落地（过冲 ≤6px）。
 * 抽成组件以便逐节点持 hook（map 内联函数不能调 hook）。
 */
const FlowNodeCard: FC<{
  step: string;
  index: number;
  tone: string;
  enterAt: number;
  left: number;
  top: number;
  width: number;
  height: number;
  chipSize: number;
  labelFont: number;
}> = ({ step, index, tone, enterAt, left, top, width, height, chipSize, labelFont }) => {
  const pop = useQBounceIn(enterAt, { distance: 32, scaleFrom: 0.9, overshootPx: 6 });
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "0 24px",
        background: C.surface,
        borderRadius: RADIUS.inner,
        border: `2.5px solid ${withAlpha(tone, 0.32)}`,
        boxShadow: SHADOW.soft,
        opacity: pop.opacity,
        transform: `translateY(${pop.y}px) scale(${pop.scale})`,
      }}
    >
      {/* 糖果序号章：粉彩芯 + ink 描边 + 左上高光点 */}
      <div
        style={{
          flex: "none",
          position: "relative",
          width: chipSize,
          height: chipSize,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: withAlpha(tone, 0.18),
            border: `3px solid ${tone}`,
            color: tone,
            fontFamily: F.enSerif,
            fontSize: chipSize * 0.5,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {index + 1}
        </div>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "18%",
            top: "12%",
            width: "26%",
            height: "18%",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.6)",
          }}
        />
      </div>
      <p
        style={{
          flex: 1,
          minWidth: 0,
          margin: 0,
          fontFamily: F.zhSerifSemi,
          fontSize: labelFont,
          lineHeight: 1.4,
          color: C.ink,
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 2,
          overflow: "hidden",
        }}
      >
        {step}
      </p>
    </div>
  );
};

export const FlowScene: FC<FlowSceneProps> = ({
  title,
  steps,
  accent = SUBJECT_ACCENTS.xianfa.accent,
  subject,
  sceneIndex = 0,
  sceneTotal = 0,
}) => {
  const progress = useStageProgress();
  const n = steps.length;

  // 行距/卡高按节点数自适应：少则舒展、多则压排（取代旧 compact 布尔阈值）
  const pitch = n > 0 ? Math.min(176, Math.max(96, Math.floor(AREA_H / n))) : 0;
  const cardH = Math.min(120, pitch - 40);
  const cardW = n > 1 ? 600 : 640;
  const rowsH = n > 0 ? pitch * (n - 1) + cardH : 0;
  const topOffset = Math.max(0, Math.floor((AREA_H - rowsH) / 2));
  const centerX = (index: number): number =>
    n <= 1 ? AREA_W / 2 : index % 2 === 0 ? AREA_W / 2 - ZIGZAG_OFFSET : AREA_W / 2 + ZIGZAG_OFFSET;
  const cardY = (index: number): number => topOffset + index * pitch;

  const labelFont = pitch >= 150 ? 33 : pitch >= 118 ? 29 : 25;
  const chipSize = Math.min(52, cardH - 20);

  // 标题入场（theme 帧精确节拍）
  const titleIn = progress(T.titleIn, SPRING.title);
  const titleY = interpolate(titleIn, [0, 1], [40, 0]);
  const ruleIn = progress(T.ruleIn, SPRING.soft);

  /** 连线 i（节点 i-1 → i）：节点 i 落地前 CONNECTOR_LEAD_FRAMES 起笔 */
  const connectorStart = (index: number): number =>
    Math.max(0, nodeDelay(index) - CONNECTOR_LEAD_FRAMES);
  /** S 形连线路径：竖向出发、横向摆渡、竖向到达 */
  const connectorPath = (index: number): string => {
    const x0 = centerX(index - 1);
    const y0 = cardY(index - 1) + cardH;
    const x1 = centerX(index);
    const y1 = cardY(index);
    const dy = Math.max(1, y1 - y0);
    return `M ${x0} ${y0} C ${x0} ${y0 + dy * 0.55}, ${x1} ${y1 - dy * 0.55}, ${x1} ${y1}`;
  };

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

        {/* 节点区：圆头连线 SVG 垫底，糖果节点卡绝对定位其上 */}
        {n > 0 && (
          <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
            <svg
              width={AREA_W}
              height={AREA_H}
              viewBox={`0 0 ${AREA_W} ${AREA_H}`}
              style={{ position: "absolute", left: 0, top: 0 }}
              aria-hidden="true"
            >
              {steps.map((_, index) =>
                index > 0 ? (
                  <g key={`conn-${index}`}>
                    {/* 粉彩宽轨（圆头胶囊轨） */}
                    <path
                      d={connectorPath(index)}
                      fill="none"
                      stroke={withAlpha(accent, 0.2)}
                      strokeWidth={10}
                      strokeLinecap="round"
                    />
                    {/* 描边生长：pathLength 归一化 + dashoffset 帧驱动（ink 圆头细线） */}
                    <path
                      d={connectorPath(index)}
                      fill="none"
                      stroke={accent}
                      strokeWidth={5.5}
                      strokeLinecap="round"
                      pathLength={100}
                      style={strokeDashStyle(progress(connectorStart(index), SPRING.soft))}
                    />
                    {/* 箭头：连线甩到位后弹出 */}
                    {(() => {
                      const pop = progress(
                        connectorStart(index) + CONNECTOR_GROW_FRAMES - 6,
                        SPRING.term,
                      );
                      const ax = centerX(index);
                      const ay = cardY(index);
                      return (
                        <polygon
                          points={`${ax - 10},${ay - 17} ${ax + 10},${ay - 17} ${ax},${ay - 2}`}
                          fill={accent}
                          opacity={Math.min(1, pop * 1.5)}
                          style={{
                            transformBox: "fill-box",
                            transformOrigin: "center",
                            transform: `scale(${interpolate(pop, [0, 1], [0.3, 1])})`,
                          }}
                        />
                      );
                    })()}
                  </g>
                ) : null,
              )}
            </svg>

            {/* 糖果节点卡 */}
            {steps.map((step, index) => (
              <FlowNodeCard
                key={`${index}-${step}`}
                step={step}
                index={index}
                tone={accent}
                enterAt={nodeDelay(index)}
                left={centerX(index) - cardW / 2}
                top={cardY(index)}
                width={cardW}
                height={cardH}
                chipSize={chipSize}
                labelFont={labelFont}
              />
            ))}
          </div>
        )}
      </AbsoluteFill>

      {/* 视觉底座叠加层 */}
      <SceneChrome
        type="flow"
        subject={subject ?? "falixue"}
        accent={accent}
        index={sceneIndex}
        total={sceneTotal}
      />
    </AbsoluteFill>
  );
};
