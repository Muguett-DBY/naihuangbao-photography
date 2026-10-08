import { AbsoluteFill, interpolate } from "remotion";
import type { LawSubjectId } from "../../types/law";
import { C, F, SAFE, SPRING, SUBJECT_ACCENTS, sceneFrameStyle, withAlpha } from "../theme";
import { SceneChrome, useStamp, useStageProgress } from "../chrome";

/**
 * 对比场景 — 左右面板从两侧滑入对撞 + 中央「VS」徽章盖章 + 逐行要点交错入场。
 * 三栏骨架（左栏 | 中缝 | 右栏）行节奏完全一致：左右同名行永远等高对齐，
 * 中缝里每行一条「左行→右行」的对齐连线在两格落位后闪现，把对照关系钉死。
 *
 * 视觉底座：SceneChrome 包壳（类型徽标 + 底部场次进度点 + 学科色角落淡晕）；
 * 动画全部帧驱动（useCurrentFrame + chrome 的 spring helpers），无 Math.random；
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
  /** 强调色（chrome 淡晕 / 中缝连线）；缺省退回右栏色，再退宪法红。 */
  accent?: string;
  /** SceneChrome 底座入参：学科 id（accent 恒有值时仅占位）与场次进度。 */
  subject?: LawSubjectId;
  /** 第几场（0-based）；total 为 0 时 chrome 不画进度点（SceneView 接线前缺省）。 */
  sceneIndex?: number;
  sceneTotal?: number;
}

/* —— 帧精确时序（30fps） —— */
const PANEL_ENTER_FRAMES = 2; // 左栏起滑
const PANEL_CROSS_FRAMES = 6; // 右栏相对左栏的错峰（对撞节奏）
const VS_STAMP_FRAMES = 16; // 双栏到位后 VS 徽章盖章
const ROWS_ENTER_FRAMES = 26; // 第一行起跳
const ROW_STAGGER_FRAMES = 4; // 相邻行错峰
const RIGHT_LAG_FRAMES = 3; // 同一行右格比左格晚（左→右读向）
const LINK_LAG_FRAMES = 10; // 行连线：两格落位后闪现

const GUTTER_W = 84; // 中缝宽
const HEADER_H = 84; // 栏头高度（三栏共享同一行节奏）
const ROW_GAP = 16;
/** 顶部让位：chrome 类型徽标占据 SAFE.top 起约 88px，内容整体下移避让 */
const CHROME_TOP_CLEAR = 88;

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
  const progress = useStageProgress();
  const vs = useStamp(VS_STAMP_FRAMES, { rotate: -8, scaleFrom: 1.7 });

  // 面板对撞：左栏从左缘滑入，右栏稍晚从右缘滑入
  const leftEnter = progress(PANEL_ENTER_FRAMES, SPRING.soft);
  const rightEnter = progress(PANEL_ENTER_FRAMES + PANEL_CROSS_FRAMES, SPRING.soft);
  const leftX = interpolate(leftEnter, [0, 1], [-88, 0]);
  const rightX = interpolate(rightEnter, [0, 1], [88, 0]);
  const dividerGrow = interpolate(Math.min(leftEnter, rightEnter), [0, 1], [0, 1]);

  const leftTone = C.ink;
  const rightTone = accent;
  const hasRows = rows.length > 0;

  // 长条目保护：按最长文本自适应缩字号（对比行是短句，超出即压排）
  const maxLen = rows.reduce(
    (max, row) => Math.max(max, row.left.length, row.right.length),
    0,
  );
  const cellFont = maxLen > 20 ? 24 : maxLen > 14 ? 28 : 32;

  /** 行 i 的左格 / 右格 / 中缝连线共用的入场时刻 */
  const rowStart = (index: number) => ROWS_ENTER_FRAMES + index * ROW_STAGGER_FRAMES;

  const renderCell = (
    side: "left" | "right",
    text: string,
    index: number,
    tone: string,
    background: string,
  ) => {
    const enter = progress(
      rowStart(index) + (side === "right" ? RIGHT_LAG_FRAMES : 0),
      SPRING.soft,
    );
    return (
      <div
        key={`${side}-${index}`}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          padding: "14px 22px",
          borderRadius: 14,
          background,
          border: `2px solid ${C.line}`,
          borderTop: `4px solid ${tone}`,
          fontFamily: F.zhSerif,
          fontSize: cellFont,
          lineHeight: 1.5,
          color: C.ink,
          overflow: "hidden",
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [26, 0])}px)`,
        }}
      >
        {text}
      </div>
    );
  };

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
          {/* 左栏：从左缘滑入 */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: ROW_GAP,
              opacity: leftEnter,
              transform: `translateX(${leftX}px)`,
            }}
          >
            <div
              style={{
                flex: "none",
                height: HEADER_H,
                borderRadius: 16,
                background: leftTone,
                color: C.surface,
                fontFamily: F.zhSerifSemi,
                fontSize: 38,
                letterSpacing: "0.08em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {leftTitle}
            </div>
            {rows.map((row, index) =>
              renderCell("left", row.left, index, leftTone, C.surface),
            )}
          </div>

          {/* 中缝：分隔线随对撞生长 + 逐行「左行→右行」对齐连线闪现 + VS 徽章 */}
          <div
            style={{
              flex: "none",
              width: GUTTER_W,
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: ROW_GAP,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                bottom: 0,
                width: 2,
                marginLeft: -1,
                background: C.line,
                transform: `scaleY(${dividerGrow})`,
              }}
            />
            <div style={{ flex: "none", height: HEADER_H }} />
            <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", gap: ROW_GAP, minHeight: 0 }}>
              {rows.map((_, index) => {
                const link = progress(rowStart(index) + LINK_LAG_FRAMES, SPRING.term);
                const flash = interpolate(link, [0, 0.35, 1], [0, 0.95, 0.55]);
                return (
                  <div
                    key={`link-${index}`}
                    aria-hidden="true"
                    style={{ flex: 1, minHeight: 0, position: "relative" }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 4,
                        right: 14,
                        top: "50%",
                        height: 3,
                        marginTop: -1.5,
                        borderRadius: 999,
                        background: withAlpha(accent, 0.8),
                        transformOrigin: "left center",
                        transform: `scaleX(${link})`,
                        opacity: flash,
                      }}
                    />
                    {/* 指向右格的小箭头，连线甩到位后弹出 */}
                    <div
                      style={{
                        position: "absolute",
                        right: 6,
                        top: "50%",
                        marginTop: -6,
                        width: 0,
                        height: 0,
                        borderTop: "6px solid transparent",
                        borderBottom: "6px solid transparent",
                        borderLeft: `10px solid ${withAlpha(accent, 0.8)}`,
                        opacity: flash,
                        transform: `scale(${interpolate(link, [0, 1], [0.4, 1])})`,
                      }}
                    />
                  </div>
                );
              })}

              {/* 中央 VS 徽章：双栏对撞到位后一记盖章 */}
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
                    background: C.surface,
                    border: `5px solid ${C.ink}`,
                    boxShadow: `0 8px 26px ${withAlpha(C.ink, 0.2)}`,
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

          {/* 右栏：从右缘滑入 */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: ROW_GAP,
              opacity: rightEnter,
              transform: `translateX(${rightX}px)`,
            }}
          >
            <div
              style={{
                flex: "none",
                height: HEADER_H,
                borderRadius: 16,
                background: rightTone,
                color: C.surface,
                fontFamily: F.zhSerifSemi,
                fontSize: 38,
                letterSpacing: "0.08em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {rightTitle}
            </div>
            {rows.map((row, index) =>
              renderCell(
                "right",
                row.right,
                index,
                rightTone,
                withAlpha(rightTone, 0.06),
              ),
            )}
          </div>
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
