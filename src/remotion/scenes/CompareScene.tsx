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
  sceneFrameStyle,
  withAlpha,
} from "../theme";
import { SceneChrome, useQBounceIn, useStamp, useStageProgress } from "../chrome";

/**
 * 对比场景（可爱令牌）— 左右粉彩双色卡从两侧 Q 弹入场 + 中央「VS」奶黄光晕徽章
 * 盖章 + 逐行要点弹跳入场。三栏骨架（左卡 | 中缝 | 右卡）行节奏完全一致：
 * 左右同名行永远等高对齐，中缝里每行一条「左行→右行」的虚线握手连线
 * （宽度裁切揭示，dash 样式不被缩放破坏）在两格落位后甩出，两端圆点弹出握手。
 *
 * 视觉底座：SceneChrome 包壳（粉彩徽标 + 进度点 + 学科淡晕 + 奶黄包贴纸）；
 * 动画全部帧驱动（useCurrentFrame + chrome 的 spring helpers，无 Math.random）；
 * prefers-reduced-motion 时 helpers 定格终态，画面完整静止。
 */

/** 对比场景的一行内容。 */
export interface CompareRow {
  left: string;
  right: string;
}

export interface CompareSceneProps {
  leftTitle: string;
  rightTitle: string;
  rows: CompareRow[];
  /** 右栏强调色（SceneView 传学科色）。 */
  rightAccent?: string;
  /** 强调色（chrome 淡晕 / 握手连线）；缺省退回右栏色，再退宪法红。 */
  accent?: string;
  /** SceneChrome 底座入参：学科 id（accent 恒有值时仅占位）与场次进度。 */
  subject?: LawSubjectId;
  /** 第几场（0-based）；total 为 0 时 chrome 不画进度点（SceneView 接线前缺省）。 */
  sceneIndex?: number;
  sceneTotal?: number;
}

/* —— 帧精确时序（30fps） —— */
const PANEL_ENTER_FRAMES = 2; // 左栏起跳
const PANEL_CROSS_FRAMES = 6; // 右栏相对左栏的错峰（对撞节奏）
const VS_STAMP_FRAMES = 16; // 双栏到位后 VS 徽章盖章
const ROWS_ENTER_FRAMES = 26; // 第一行起跳
const ROW_STAGGER_FRAMES = 4; // 相邻行错峰
const RIGHT_LAG_FRAMES = 3; // 同一行右格比左格晚（左→右读向）
const LINK_LAG_FRAMES = 10; // 握手连线：两格落位后甩出

const GUTTER_W = 84; // 中缝宽
const HEADER_H = 84; // 栏头胶囊高度（三栏共享同一行节奏）
const ROW_GAP = 12;
const PANEL_PAD = 14; // 双色卡内边距（中缝上下同值，保证行对齐）
/** 顶部让位：chrome 类型徽标占据 SAFE.top 起约 88px，内容整体下移避让 */
const CHROME_TOP_CLEAR = 88;

/* —— 行 i 的左格 / 右格 / 中缝握手连线共用的入场时刻 —— */
const rowStart = (index: number) => ROWS_ENTER_FRAMES + index * ROW_STAGGER_FRAMES;

/**
 * 对比格（可爱令牌）：浮层白胶囊卡，useQBounceIn 弹跳入场（≤5px 过冲）。
 * 抽成组件以便逐格持 hook（map 内联函数不能调 hook）。
 */
const CompareCell: FC<{
  text: string;
  enterAt: number;
  font: number;
}> = ({ text, enterAt, font }) => {
  const pop = useQBounceIn(enterAt, { distance: 18, scaleFrom: 0.92, overshootPx: 5 });
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        padding: "14px 22px",
        borderRadius: RADIUS.bubble,
        background: C.raised,
        border: `2px solid ${C.line}`,
        fontFamily: F.zhSerif,
        fontSize: font,
        lineHeight: 1.5,
        color: C.ink,
        overflow: "hidden",
        opacity: pop.opacity,
        transform: `translateY(${pop.y}px) scale(${pop.scale})`,
      }}
    >
      {text}
    </div>
  );
};

/**
 * 虚线握手连线（可爱令牌）：repeating-linear-gradient 画 dash，外层 overflow
 * 裁切 + 宽度帧驱动揭示（不缩放 dash 样式）；两端圆点在连线甩到位后弹出，
 * 呈「左行—右行」握手钉死对照关系。
 */
const HandshakeLink: FC<{ tone: string; enterAt: number }> = ({ tone, enterAt }) => {
  const grow = useStageProgress()(enterAt, SPRING.soft);
  const dot = useStageProgress()(enterAt + 4, SPRING.term);
  const flash = interpolate(grow, [0, 0.35, 1], [0, 0.95, 0.6]);
  return (
    <div style={{ flex: 1, minHeight: 0, position: "relative" }} aria-hidden="true">
      <div
        style={{
          position: "absolute",
          left: 12,
          right: 22,
          top: "50%",
          height: 4,
          marginTop: -2,
          overflow: "hidden",
          opacity: flash,
        }}
      >
        <div
          style={{
            width: `${grow * 100}%`,
            height: "100%",
            backgroundImage: `repeating-linear-gradient(90deg, ${withAlpha(
              tone,
              0.85,
            )} 0 9px, transparent 9px 17px)`,
          }}
        />
      </div>
      {/* 两端握手圆点 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "50%",
          width: 9,
          height: 9,
          marginTop: -4.5,
          borderRadius: "50%",
          background: tone,
          opacity: flash,
          transform: `scale(${interpolate(dot, [0, 1], [0.3, 1])})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          width: 9,
          height: 9,
          marginTop: -4.5,
          borderRadius: "50%",
          background: tone,
          opacity: flash,
          transform: `scale(${interpolate(dot, [0, 1], [0.3, 1])})`,
        }}
      />
    </div>
  );
};

/**
 * 粉彩双色卡的一侧（可爱令牌）：粉彩底大圆角卡 + 浮层白胶囊栏头（ink 文楷标签
 * + 软阴影）+ 内部对比格。useQBounceIn 水平滑入 + 轻微上浮过冲（hop-in 手感）。
 */
const PanelColumn: FC<{
  side: "left" | "right";
  title: string;
  /** 栏头文字色（对比度红线：ink 或学科 ink 变体） */
  tone: string;
  /** 粉彩卡底 */
  cardBg: string;
  enterAt: number;
  children: React.ReactNode;
}> = ({ side, title, tone, cardBg, enterAt, children }) => {
  const pop = useQBounceIn(enterAt, { distance: 34, scaleFrom: 0.94, overshootPx: 6 });
  const x = interpolate(pop.progress, [0, 1], [side === "left" ? -96 : 96, 0]);
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        opacity: pop.opacity,
        transform: `translateX(${x}px) translateY(${pop.y}px) scale(${pop.scale})`,
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: ROW_GAP,
          padding: PANEL_PAD,
          borderRadius: RADIUS.card,
          background: cardBg,
          border: `2px solid ${withAlpha(C.ink, 0.05)}`,
          boxShadow: SHADOW.soft,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: "none",
            height: HEADER_H,
            padding: "0 26px",
            borderRadius: RADIUS.pill,
            background: C.raised,
            border: `2px solid ${withAlpha(tone, 0.22)}`,
            boxShadow: SHADOW.soft,
            color: tone,
            fontFamily: F.zhSerifSemi,
            fontSize: 38,
            letterSpacing: "0.08em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {title}
        </div>
        {children}
      </div>
    </div>
  );
};

export function CompareScene({
  leftTitle,
  rightTitle,
  rows,
  rightAccent,
  accent = rightAccent ?? SUBJECT_ACCENTS.xianfa.accent,
  subject,
  sceneIndex = 0,
  sceneTotal = 0,
}: CompareSceneProps) {
  const vs = useStamp(VS_STAMP_FRAMES, { rotate: -8, scaleFrom: 1.7 });
  const hasRows = rows.length > 0;

  // 长条目保护：按最长文本自适应缩字号（对比行是短句，超出即压排）
  const maxLen = rows.reduce(
    (max, row) => Math.max(max, row.left.length, row.right.length),
    0,
  );
  const cellFont = maxLen > 20 ? 24 : maxLen > 14 ? 28 : 32;

  // 粉彩双色：左卡奶黄奶油调（custard 仅作装饰底，ink 文字其上 ≥7:1），
  // 右卡学科粉彩（accent 为 ink 变体时以低透明度铺出同色系粉彩）
  const leftCardBg = withAlpha(C.custard, 0.2);
  const rightCardBg = withAlpha(accent, 0.16);
  const leftTone = C.ink;
  const rightTone = accent;

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper }}>
      {/* 内容层：sceneFrameStyle 安全区 padding + chrome 徽标让位（内层勿再嵌套） */}
      <AbsoluteFill
        style={{
          ...sceneFrameStyle,
          paddingTop: SAFE.top + CHROME_TOP_CLEAR,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "stretch", height: "100%" }}>
          {/* 左卡：奶黄奶油粉彩 + 白胶囊栏头，Q 弹滑入 */}
          <PanelColumn
            side="left"
            title={leftTitle}
            tone={leftTone}
            cardBg={leftCardBg}
            enterAt={PANEL_ENTER_FRAMES}
          >
            {rows.map((row, index) => (
              <CompareCell
                key={`left-${index}`}
                text={row.left}
                enterAt={rowStart(index)}
                font={cellFont}
              />
            ))}
          </PanelColumn>

          {/* 中缝：逐行「左行—右行」虚线握手连线 + VS 徽章（上下留白与卡 padding 对齐） */}
          <div
            style={{
              flex: "none",
              width: GUTTER_W,
              display: "flex",
              flexDirection: "column",
              gap: ROW_GAP,
              padding: `${PANEL_PAD}px 0`,
            }}
          >
            <div style={{ flex: "none", height: HEADER_H }} />
            <div
              style={{
                flex: 1,
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: ROW_GAP,
                minHeight: 0,
              }}
            >
              {rows.map((_, index) => (
                <HandshakeLink
                  key={`link-${index}`}
                  tone={accent}
                  enterAt={rowStart(index) + LINK_LAG_FRAMES}
                />
              ))}

              {/* 中央 VS 徽章：双栏对撞到位后一记盖章（奶黄光晕 + 软阴影） */}
              {hasRows && (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 92,
                    height: 92,
                    margin: "-46px 0 0 -46px",
                    borderRadius: "50%",
                    background: C.raised,
                    border: `4px solid ${C.ink}`,
                    boxShadow: `0 0 0 13px ${withAlpha(C.custard, 0.32)}, ${SHADOW.lift}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: vs.opacity,
                    transform: `scale(${vs.scale}) rotate(${vs.rotate}deg)`,
                    zIndex: 2,
                  }}
                >
                  <span
                    style={{
                      fontFamily: F.enSerif,
                      fontSize: 40,
                      fontWeight: 700,
                      color: C.ink,
                      letterSpacing: "0.02em",
                    }}
                  >
                    VS
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 右卡：学科粉彩 + 白胶囊栏头，错峰 Q 弹滑入 */}
          <PanelColumn
            side="right"
            title={rightTitle}
            tone={rightTone}
            cardBg={rightCardBg}
            enterAt={PANEL_ENTER_FRAMES + PANEL_CROSS_FRAMES}
          >
            {rows.map((row, index) => (
              <CompareCell
                key={`right-${index}`}
                text={row.right}
                enterAt={rowStart(index) + RIGHT_LAG_FRAMES}
                font={cellFont}
              />
            ))}
          </PanelColumn>
        </div>
      </AbsoluteFill>

      {/* 视觉底座叠加层：类型徽标 + 场次进度点 + 学科色淡晕（pointer-events 全关） */}
      <SceneChrome
        type="compare"
        subject={subject ?? "falixue"}
        accent={accent}
        index={sceneIndex}
        total={sceneTotal}
      />
    </AbsoluteFill>
  );
}
