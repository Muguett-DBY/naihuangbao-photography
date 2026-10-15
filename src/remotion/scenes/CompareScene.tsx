import { AbsoluteFill, interpolate } from "remotion";
import type { FC } from "react";
import type { LawSubjectId } from "../../types/law";
import { C, F, RADIUS, SAFE, SPRING, sceneFrameStyle } from "../theme";
import { SceneChrome, useRiseIn, useStageProgress, useStamp } from "../chrome";

/**
 * 对比场景（Apple 黑白灰）— 左右白卡发丝线双栏从两侧缓出滑入 + 中央「VS」
 * 墨色圆片落位 + 逐行要点缓出。三栏骨架（左卡 | 中缝 | 右卡）行节奏完全一致：
 * 左右同名行永远等高对齐，中缝里每行一条「左行—右行」的发丝线连线（宽度裁切
 * 揭示）在两格落位后铺开，两端灰点钉住对照关系。
 *
 * 视觉底座：SceneChrome 包壳（灰阶徽标 + 学科锚点进度点）；
 * 动画全部帧驱动（useCurrentFrame + chrome 的 helpers，无 Math.random）；
 * prefers-reduced-motion 时 helpers 定格终态，画面完整静止。
 * accent/rightAccent prop 仅为 SceneView 既有接线保留，画面不随学科变色。
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
  /** 兼容接线（SceneView 恒传）：Apple 化后画面不随此值变色 */
  rightAccent?: string;
  /** 兼容接线（SceneView 恒传）：Apple 化后画面不随此值变色 */
  accent?: string;
  /** SceneChrome 底座入参：学科 id（进度点锚点色）与场次进度。 */
  subject?: LawSubjectId;
  /** 第几场（0-based）；total 为 0 时 chrome 不画进度点（SceneView 接线前缺省）。 */
  sceneIndex?: number;
  sceneTotal?: number;
}

/* —— 帧精确时序（30fps） —— */
const PANEL_ENTER_FRAMES = 2; // 左栏起跳
const PANEL_CROSS_FRAMES = 6; // 右栏相对左栏的错峰（对撞节奏）
const VS_STAMP_FRAMES = 16; // 双栏到位后 VS 圆片落位
const ROWS_ENTER_FRAMES = 26; // 第一行起跳
const ROW_STAGGER_FRAMES = 4; // 相邻行错峰
const RIGHT_LAG_FRAMES = 3; // 同一行右格比左格晚（左→右读向）
const LINK_LAG_FRAMES = 10; // 握手连线：两格落位后铺开

const GUTTER_W = 84; // 中缝宽
const HEADER_H = 84; // 栏头胶囊高度（三栏共享同一行节奏）
const ROW_GAP = 12;
const PANEL_PAD = 14; // 双栏卡内边距（中缝上下同值，保证行对齐）
/** 顶部让位：chrome 类型徽标占据 SAFE.top 起约 88px，内容整体下移避让 */
const CHROME_TOP_CLEAR = 88;

/* —— 行 i 的左格 / 右格 / 中缝连线共用的入场时刻 —— */
const rowStart = (index: number) => ROWS_ENTER_FRAMES + index * ROW_STAGGER_FRAMES;

/**
 * 对比格：浅灰分区块（paper 底 + 控件圆角），useRiseIn 缓出落位（无过冲）。
 * 抽成组件以便逐格持 hook（map 内联函数不能调 hook）。
 */
const CompareCell: FC<{
  text: string;
  enterAt: number;
  font: number;
}> = ({ text, enterAt, font }) => {
  const pop = useRiseIn(enterAt, { distance: 14 });
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        padding: "14px 22px",
        borderRadius: RADIUS.control,
        background: C.paper,
        fontFamily: F.zhSerif,
        fontSize: font,
        lineHeight: 1.5,
        color: C.ink,
        overflow: "hidden",
        opacity: pop.opacity,
        transform: `translateY(${pop.y}px)`,
      }}
    >
      {text}
    </div>
  );
};

/**
 * 中缝连线：外层 overflow 裁切 + 宽度帧驱动揭示；两端灰点在连线铺到位后
 * 弹出，呈「左行—右行」钉死对照关系（发丝线实线，虚线已随可爱令牌退役）。
 */
const HandshakeLink: FC<{ enterAt: number }> = ({ enterAt }) => {
  const grow = useStageProgress()(enterAt, SPRING.soft);
  const dot = useStageProgress()(enterAt + 4, SPRING.term);
  return (
    <div style={{ flex: 1, minHeight: 0, position: "relative" }} aria-hidden="true">
      <div
        style={{
          position: "absolute",
          left: 12,
          right: 22,
          top: "50%",
          height: 3,
          marginTop: -1.5,
          overflow: "hidden",
          opacity: 0.9,
        }}
      >
        <div
          style={{
            width: `${grow * 100}%`,
            height: "100%",
            backgroundColor: C.line,
          }}
        />
      </div>
      {/* 两端对照圆点 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "50%",
          width: 9,
          height: 9,
          marginTop: -4.5,
          borderRadius: "50%",
          background: C.gray,
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
          background: C.gray,
          transform: `scale(${interpolate(dot, [0, 1], [0.3, 1])})`,
        }}
      />
    </div>
  );
};

/**
 * 白卡双栏的一侧：白卡 + 发丝线描边 + 浅灰胶囊栏头（ink 600 标签）+ 内部
 * 对比格（浅灰分区块）。useRiseIn 水平滑入（200-300ms 缓出，无过冲）。
 */
const PanelColumn: FC<{
  side: "left" | "right";
  title: string;
  enterAt: number;
  children: React.ReactNode;
}> = ({ side, title, enterAt, children }) => {
  const pop = useRiseIn(enterAt, { distance: 26, durationFrames: 9 });
  const x = interpolate(pop.progress, [0, 1], [side === "left" ? -72 : 72, 0]);
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        opacity: pop.opacity,
        transform: `translateX(${x}px) translateY(${pop.y}px)`,
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
          background: C.surface,
          border: `2px solid ${C.line}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: "none",
            height: HEADER_H,
            padding: "0 26px",
            borderRadius: RADIUS.pill,
            background: C.paper,
            color: C.ink,
            fontFamily: F.zhSerifSemi,
            fontWeight: 600,
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
  subject,
  sceneIndex = 0,
  sceneTotal = 0,
}: CompareSceneProps) {
  const vs = useStamp(VS_STAMP_FRAMES, { scaleFrom: 0.7 });
  const hasRows = rows.length > 0;

  // 长条目保护：按最长文本自适应缩字号（对比行是短句，超出即压排）
  const maxLen = rows.reduce(
    (max, row) => Math.max(max, row.left.length, row.right.length),
    0,
  );
  const cellFont = maxLen > 20 ? 24 : maxLen > 14 ? 28 : 32;

  return (
    <AbsoluteFill style={{ backgroundColor: C.surface }}>
      {/* 内容层：sceneFrameStyle 安全区 padding + chrome 徽标让位（内层勿再嵌套） */}
      <AbsoluteFill
        style={{
          ...sceneFrameStyle,
          paddingTop: SAFE.top + CHROME_TOP_CLEAR,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "stretch", height: "100%" }}>
          {/* 左卡：白卡 + 浅灰栏头，缓出滑入 */}
          <PanelColumn side="left" title={leftTitle} enterAt={PANEL_ENTER_FRAMES}>
            {rows.map((row, index) => (
              <CompareCell
                key={`left-${index}`}
                text={row.left}
                enterAt={rowStart(index)}
                font={cellFont}
              />
            ))}
          </PanelColumn>

          {/* 中缝：逐行「左行—右行」发丝线连线 + VS 圆片（上下留白与卡 padding 对齐） */}
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
                <HandshakeLink key={`link-${index}`} enterAt={rowStart(index) + LINK_LAG_FRAMES} />
              ))}

              {/* 中央 VS 圆片：双栏到位后墨底白字一记落位（无光晕无阴影） */}
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
                    background: C.ink,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: vs.opacity,
                    transform: `scale(${vs.scale})`,
                    zIndex: 2,
                  }}
                >
                  <span
                    style={{
                      fontFamily: F.enSerif,
                      fontSize: 38,
                      fontWeight: 700,
                      color: C.surface,
                      letterSpacing: "0.02em",
                    }}
                  >
                    VS
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 右卡：白卡 + 浅灰栏头，错峰缓出滑入 */}
          <PanelColumn
            side="right"
            title={rightTitle}
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

      {/* 视觉底座叠加层：类型徽标 + 场次进度点（pointer-events 全关） */}
      <SceneChrome
        type="compare"
        subject={subject ?? "falixue"}
        index={sceneIndex}
        total={sceneTotal}
      />
    </AbsoluteFill>
  );
}
