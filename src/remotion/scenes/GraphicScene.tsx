import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { FC } from "react";
import type { LawGraphic, LawSubjectId } from "../../types/law";
import { C, F, RADIUS, SAFE, SPRING, sceneFrameStyle } from "../theme";
import { useRiseIn, useStageProgress } from "../chrome";
import {
  GraphicStructureRow,
  buildRows,
  kindLabel,
  structureRowKey,
} from "./GraphicSceneRows";

/**
 * GraphicScene — 完整图解场景（LAW_GRAPHIC_MAP 命中的课在课堂序列尾部的收尾回顾）。
 *
 * 场景可行性结论（scene-auditor graphicFeasibility）：GraphicStage 与七种 Diagram
 * 组件均为 framer-motion 墙钟动画 + 有状态舞台（useState/setTimeout/localStorage），
 * 无法逐帧确定性复用；但 LawGraphic 数据完全结构化（nodes/captions/balance/matrix），
 * 故本组件按「图解高潮帧」口径以 remotion spring/interpolate 原生重排图解的完整
 * 知识结构——解说步进（captions）驱动节点逐批揭示，帧号唯一决定画面，确定性成立。
 *
 * 布局（1080×1920 竖版，Apple 黑白灰）：头部（浅灰胶囊徽标 + 无衬线标题 +
 * intro + 墨色强调杠 + 时间线色带图例）→ 结构区（浅灰分区底板，按 kind 分型：
 * tree 根/枝/叶、balance 天平两侧、matrix 对照矩阵、其余按序节点卡——白卡 +
 * 发丝线行卡逐行揭示）→ 底部解说字幕（与 GraphicStage 同语义的「x / N 步」
 * 灰阶步进胶囊）。
 *
 * 动画完全帧驱动（chrome 的 useStageProgress/useRiseIn + interpolate，无
 * Math.random/Date/localStorage/framer-motion）；prefers-reduced-motion 时全部定格终态。
 * accent prop 仅为 ClassroomPlayer 既有接线保留，画面不随学科变色。
 */

/* ==================== 时序常量（帧，30fps 基准） ==================== */

const BADGE_IN = 6; // 徽标/标题起跳（与 T.titleIn 同拍）
const INTRO_IN = 20; // intro 行起跳
const PANEL_IN = 30; // 结构区浅灰底板起跳（首批结构行之前）
const REVEAL_START = 46; // 第一批结构行起跳（头部完成入位之后）
const PER_CAPTION = 84; // 每条解说步停留 2.8s（GraphicStage 自动播放 3.2s 的收紧版）
const TAIL_HOLD = 30; // 收尾停留
const CAPTION_FADE = 8; // 字幕淡入/淡出宽度

/** 该场景播完「头部 + 全部解说步 + 收尾」所需时长（帧）；ClassroomPlayer 依赖 */
export const graphicSceneDurationInFrames = (captionCount: number): number =>
  REVEAL_START + Math.max(captionCount, 1) * PER_CAPTION + TAIL_HOLD;

/* 结构行模型（StructureRow / buildRows / kindLabel / 单行渲染）→ 见 GraphicSceneRows.tsx */

/* ==================== 场景组件 ==================== */

export interface GraphicSceneProps {
  graphic: LawGraphic;
  /** 兼容接线（ClassroomPlayer 恒传）：Apple 化后画面不随此值变色 */
  accent?: string;
  /** 学科 id（仅作语义兜底占位） */
  subject?: LawSubjectId;
}

export const GraphicScene: FC<GraphicSceneProps> = ({ graphic }) => {
  const frame = useCurrentFrame();
  const progress = useStageProgress();
  const badgePop = useRiseIn(BADGE_IN, { distance: 18, durationFrames: 7 });

  const captions = graphic.captions;
  const total = Math.max(captions.length, 1);
  const rows = buildRows(graphic);

  /** 当前解说步（帧号唯一决定；与 GraphicStage 的「第 x / N 步」同语义） */
  const active = Math.min(total - 1, Math.max(0, Math.floor((frame - REVEAL_START) / PER_CAPTION)));

  /** 行 i 的揭示进度：解说步等比映射到行序列（TreeDiagram 同款比例口径），末步整图完整 */
  const rowStart = (index: number): number =>
    REVEAL_START + Math.floor((index / Math.max(rows.length, 1)) * total) * PER_CAPTION;
  const rowIn = (index: number): number =>
    progress(rowStart(index), SPRING.soft);

  // 头部
  const badge = progress(BADGE_IN, SPRING.title);
  const intro = progress(INTRO_IN, SPRING.soft);
  const panel = progress(PANEL_IN, SPRING.soft);
  const hint = progress(REVEAL_START + 12, SPRING.soft);

  // 结构区自适应行距：行少舒展、行多压排（行高夹在 [86, 176]）
  const HEADER_H = 250;
  const CHROME_TOP_CLEAR = 88;
  const CAPTION_H = 210;
  const areaH = SAFE.bottom - SAFE.top - CHROME_TOP_CLEAR - HEADER_H - CAPTION_H;
  const pitch = rows.length > 0 ? Math.min(176, Math.max(86, Math.floor(areaH / rows.length))) : 0;
  const rowsTop = Math.max(0, Math.floor((areaH - pitch * rows.length) / 2));
  // 浅灰分区底板：贴住结构行外扩 14px（行少时不过分空荡）
  const panelTop = Math.max(0, rowsTop - 14);
  const panelH = rows.length > 0 ? Math.min(areaH - panelTop, pitch * rows.length + 28) : 0;

  const labelFont = pitch >= 150 ? 33 : pitch >= 116 ? 30 : 26;
  const detailFont = pitch >= 150 ? 24 : pitch >= 116 ? 22 : 20;

  /** 解说字幕 i 的确定性淡入淡出（窗口 [t0, t1)，末条驻留到片尾） */
  const captionWindow = (index: number): [number, number] => {
    const t0 = REVEAL_START + index * PER_CAPTION;
    const t1 = index + 1 < total ? REVEAL_START + (index + 1) * PER_CAPTION : REVEAL_START + total * PER_CAPTION + TAIL_HOLD;
    return [t0, t1];
  };

  return (
    <AbsoluteFill style={{ backgroundColor: C.surface }}>
      <AbsoluteFill
        style={{
          ...sceneFrameStyle,
          paddingTop: SAFE.top + CHROME_TOP_CLEAR,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 头部：浅灰胶囊徽标 + 无衬线标题 + 墨色强调杠 + intro +（时间线）图例
            （div：header 在课堂 Player 的页面 DOM 里会产出无标签 landmark，WCAG 1.3.1） */}
        <div style={{ flex: "none", height: HEADER_H, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 26px",
                borderRadius: RADIUS.pill,
                backgroundColor: C.paper,
                fontFamily: F.heading,
                fontWeight: 600,
                fontSize: 27,
                letterSpacing: "0.14em",
                color: C.ink,
                opacity: badgePop.opacity,
                transform: `translateY(${badgePop.y}px)`,
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>◆</span>
              完整图解 · {kindLabel(graphic.kind)}
            </span>
          </div>
          <h1
            style={{
              margin: "18px 0 0",
              fontFamily: F.zhBlack,
              fontWeight: 700,
              fontSize: 46,
              lineHeight: 1.25,
              letterSpacing: "0.02em",
              color: C.ink,
              opacity: badge,
              transform: `translateY(${interpolate(badge, [0, 1], [26, 0])}px)`,
            }}
          >
            {graphic.title}
          </h1>
          {/* 强调杠：墨色细横杠（层级靠字重与墨色，不加彩色） */}
          <div
            style={{
              width: 210,
              height: 6,
              marginTop: 16,
              borderRadius: RADIUS.pill,
              background: C.ink,
              transformOrigin: "left center",
              transform: `scaleX(${progress(BADGE_IN + 8, SPRING.soft)})`,
            }}
          />
          <p
            style={{
              margin: "14px 0 0",
              fontFamily: F.zhSerif,
              fontSize: 26,
              lineHeight: 1.5,
              color: C.gray,
              opacity: intro,
              transform: `translateY(${interpolate(intro, [0, 1], [18, 0])}px)`,
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
            }}
          >
            {graphic.intro}
          </p>
          {graphic.eras?.length ? (
            <div style={{ display: "flex", gap: 18, marginTop: 12, opacity: intro }}>
              {graphic.eras.map((era) => (
                <span
                  key={era.label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: F.zhSans,
                    fontSize: 20,
                    color: C.gray,
                  }}
                >
                  {/* 时代分区点：画布灰阶（彩色预算 7 槽不接纳数据态颜色） */}
                  <span
                    aria-hidden="true"
                    style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: C.ink, display: "inline-block" }}
                  />
                  {era.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* 结构区：浅灰分区底板先行铺开（白卡行卡在其上逐行揭示——底色分区，
            行卡靠 hairline 与底板分层）；树根/树枝+叶 / 节点卡 / 天平行 / 矩阵行，
            行渲染见 GraphicSceneRows */}
        <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
          {rows.length > 0 && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: panelTop,
                height: panelH,
                boxSizing: "border-box",
                borderRadius: RADIUS.card,
                background: C.paper,
                opacity: panel,
                transform: `translateY(${interpolate(panel, [0, 1], [14, 0])}px)`,
              }}
            />
          )}
          {rows.map((row, index) => (
            <GraphicStructureRow
              key={structureRowKey(row, index)}
              row={row}
              index={index}
              enter={rowIn(index)}
              pitch={pitch}
              labelFont={labelFont}
              detailFont={detailFont}
              top={rowsTop + index * pitch}
              headProgress={progress(REVEAL_START, SPRING.soft)}
            />
          ))}
        </div>

        {/* 底部：解说字幕（「x / N 步」灰阶步进胶囊，与 GraphicStage 同语义）+ 回看提示 */}
        <div style={{ flex: "none", height: CAPTION_H, position: "relative", overflow: "hidden" }}>
          {captions.map((caption, index) => {
            const [t0, t1] = captionWindow(index);
            const opacity =
              index === total - 1
                ? interpolate(frame, [t0, t0 + CAPTION_FADE], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                : interpolate(
                    frame,
                    [t0, t0 + CAPTION_FADE, t1 - CAPTION_FADE, t1],
                    [0, 1, 1, 0],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                  );
            return (
              <p
                key={`${index}-${caption.slice(0, 8)}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  margin: 0,
                  opacity,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 18,
                }}
              >
                <span
                  style={{
                    flex: "none",
                    padding: "8px 18px",
                    borderRadius: RADIUS.pill,
                    background: C.paper,
                    fontFamily: F.enSerif,
                    fontSize: 26,
                    fontWeight: 700,
                    color: C.ink,
                  }}
                >
                  {index + 1} / {total}
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: F.zhSerifSemi,
                    fontWeight: 600,
                    fontSize: 30,
                    lineHeight: 1.5,
                    color: C.ink,
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 3,
                    overflow: "hidden",
                  }}
                >
                  {caption}
                </span>
              </p>
            );
          })}
          <p
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              margin: 0,
              textAlign: "center",
              fontFamily: F.zhSans,
              fontSize: 22,
              color: C.gray,
              opacity: hint * 0.9,
            }}
          >
            想手动逐帧回看：课时页顶栏点「图解」
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
