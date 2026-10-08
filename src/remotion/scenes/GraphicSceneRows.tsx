import { interpolate } from "remotion";
import type { CSSProperties, FC } from "react";
import type { GraphicNode, LawGraphic } from "../../types/law";
import { C, F, withAlpha } from "../theme";

/**
 * GraphicSceneRows — GraphicScene 的结构行子模块（行数架构预算拆分，逻辑与样式
 * 自 GraphicScene.tsx 原样平移，动画帧号口径不变）：
 * - buildRows：LawGraphic → 逐行揭示单元（纯函数）
 * - GraphicStructureRow：单行渲染（root / branch+叶 / node 卡 / diff 天平行 / 矩阵行）
 *
 * 全部为纯渲染：揭示进度（enter/headProgress）由 GraphicScene 以帧号算好传入，
 * 本模块不持 remotion hook，确定性由父级唯一帧号保证。
 */

/* ==================== 结构行模型（kind → 统一的逐行揭示单元） ==================== */

export type StructureRow =
  | { kind: "root"; label: string; detail: string }
  | { kind: "branch"; label: string; detail: string; leaves: GraphicNode[] }
  | { kind: "node"; index: number; label: string; detail: string; step?: string }
  | { kind: "diff"; dim: string; a: string; b: string }
  | { kind: "matrixHead"; cells: string[] }
  | { kind: "matrixRow"; cells: string[] };

/** LawGraphic → 逐行揭示单元（与各 Diagram 的数据语义一一对应，纯函数） */
export function buildRows(graphic: LawGraphic): StructureRow[] {
  if (graphic.kind === "tree") {
    const root = graphic.nodes.find((node) => node.parent === -1);
    const branches = graphic.nodes.filter((node) => node.parent === 0);
    if (root || branches.length > 0) {
      const rows: StructureRow[] = [];
      if (root) rows.push({ kind: "root", label: root.label, detail: root.detail });
      for (const branch of branches) {
        const branchIndex = graphic.nodes.indexOf(branch);
        const leaves = graphic.nodes.filter((node) => (node.parent ?? -2) === branchIndex);
        rows.push({ kind: "branch", label: branch.label, detail: branch.detail, leaves });
      }
      return rows;
    }
    // 数据不成树（无根无枝）→ 按序节点卡兜底，内容一个不丢
  }

  if (graphic.kind === "balance" && graphic.balance) {
    return graphic.balance.diffs
      .slice(0, 6)
      .map(([dim, a, b]) => ({ kind: "diff" as const, dim, a, b }));
  }

  if (graphic.kind === "matrix" && graphic.matrix) {
    return [
      { kind: "matrixHead", cells: ["对比维度", ...graphic.matrix.columns] },
      ...graphic.matrix.rows
        .slice(0, 7)
        .map((row) => ({ kind: "matrixRow" as const, cells: [...row] })),
    ];
  }

  // flow / assemble / stairs / timeline（及不成树的 tree 兜底）：按序节点卡
  return graphic.nodes.slice(0, 10).map((node, index) => ({
    kind: "node" as const,
    index,
    label: node.label,
    detail: node.detail,
    step: node.step,
  }));
}

/** 图解 kind → 头部徽标文案（GraphicScene 头部使用） */
export function kindLabel(kind: LawGraphic["kind"]): string {
  switch (kind) {
    case "assemble":
      return "🧩 装配图";
    case "flow":
      return "🔗 流程图";
    case "tree":
      return "🌳 体系树";
    case "timeline":
      return "🕰️ 时间线";
    case "balance":
      return "⚖️ 对比图";
    case "stairs":
      return "🪜 阶梯图";
    case "matrix":
      return "🧮 对照矩阵";
    default:
      return "📊 图解";
  }
}

/** 结构行的 React key（与拆分前逐字一致，保持 reconciler 行为不变） */
export function structureRowKey(row: StructureRow, index: number): string {
  switch (row.kind) {
    case "root":
      return `root-${row.label}`;
    case "branch":
      return `branch-${row.label}`;
    case "node":
      return `node-${row.index}-${row.label}`;
    case "diff":
      return `diff-${row.dim}`;
    default:
      return `${row.kind}-${row.cells[0] ?? index}`;
  }
}

/* ==================== 单行渲染 ==================== */

/** 结构卡底座（root/branch/node/diff 共用；矩阵行样式自持） */
function cardBaseStyle(tone: string): CSSProperties {
  return {
    boxSizing: "border-box",
    background: C.surface,
    borderRadius: 18,
    border: `2px solid ${C.line}`,
    borderTop: `4px solid ${withAlpha(tone, 0.6)}`,
    boxShadow: `0 8px 24px ${withAlpha(C.ink, 0.06)}`,
  };
}

interface GraphicStructureRowProps {
  row: StructureRow;
  index: number;
  /** 行揭示进度（GraphicScene 帧驱动算出；0 = 未揭示） */
  enter: number;
  tone: string;
  pitch: number;
  labelFont: number;
  detailFont: number;
  /** 行顶部 y（rowsTop + index * pitch） */
  top: number;
  /** 矩阵表头行的揭示进度（与首批结构行同拍） */
  headProgress: number;
}

export const GraphicStructureRow: FC<GraphicStructureRowProps> = ({
  row,
  index,
  enter,
  tone,
  pitch,
  labelFont,
  detailFont,
  top,
  headProgress,
}) => {
  const revealed = enter > 0;
  const style: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    top,
    height: pitch - 14,
    opacity: enter,
    transform: `translateY(${interpolate(enter, [0, 1], [28, 0])}px) scale(${interpolate(enter, [0, 1], [0.96, 1])})`,
  };
  const cardBase = cardBaseStyle(tone);

  if (row.kind === "root") {
    return (
      <div
        style={{
          ...style,
          ...cardBase,
          borderTop: `4px solid ${tone}`,
          background: withAlpha(tone, 0.12),
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 30px",
        }}
      >
        <b style={{ fontFamily: F.zhBlack, fontSize: labelFont + 4, color: tone, lineHeight: 1.3 }}>
          {row.label}
        </b>
        <small
          style={{
            fontFamily: F.zhSerif,
            fontSize: detailFont,
            color: C.ink,
            lineHeight: 1.4,
            marginTop: 6,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
          }}
        >
          {row.detail}
        </small>
      </div>
    );
  }

  if (row.kind === "branch") {
    return (
      <div
        style={{
          ...style,
          ...cardBase,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: pitch >= 130 ? 10 : 4,
          padding: "12px 30px",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, minWidth: 0 }}>
          <b style={{ fontFamily: F.zhSerifSemi, fontSize: labelFont, color: C.ink, flex: "none" }}>
            {row.label}
          </b>
          <small
            style={{
              fontFamily: F.zhSerif,
              fontSize: detailFont,
              color: C.gray,
              minWidth: 0,
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 1,
              overflow: "hidden",
            }}
          >
            {row.detail}
          </small>
        </div>
        {row.leaves.length > 0 && pitch >= 110 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {row.leaves.slice(0, 6).map((leaf) => (
              <span
                key={leaf.label}
                title={leaf.detail}
                style={{
                  padding: "6px 16px",
                  borderRadius: 999,
                  border: `2px solid ${withAlpha(tone, 0.4)}`,
                  backgroundColor: withAlpha(tone, 0.08),
                  fontFamily: F.zhSans,
                  fontSize: 21,
                  color: C.ink,
                }}
              >
                {leaf.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (row.kind === "node") {
    const chip = Math.min(54, pitch - 34);
    return (
      <div
        style={{
          ...style,
          ...cardBase,
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "0 26px",
        }}
      >
        <div
          style={{
            flex: "none",
            width: chip,
            height: chip,
            borderRadius: "50%",
            background: withAlpha(tone, 0.12),
            border: `3px solid ${tone}`,
            color: tone,
            fontFamily: F.enSerif,
            fontSize: chip * 0.48,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {row.index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ fontFamily: F.zhSerifSemi, fontSize: labelFont, color: C.ink, lineHeight: 1.3 }}>
            {row.label}
          </b>
          {pitch >= 108 ? (
            <small
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden",
                marginTop: 4,
                fontFamily: F.zhSerif,
                fontSize: detailFont,
                color: C.gray,
                lineHeight: 1.4,
              }}
            >
              {row.detail}
            </small>
          ) : null}
        </div>
        {row.step ? (
          <span
            style={{
              flex: "none",
              padding: "6px 16px",
              borderRadius: 10,
              background: withAlpha(tone, 0.14),
              fontFamily: F.zhSans,
              fontSize: 21,
              color: tone,
            }}
          >
            {row.step}
          </span>
        ) : null}
      </div>
    );
  }

  if (row.kind === "diff") {
    const cell: CSSProperties = {
      fontFamily: F.zhSerif,
      fontSize: detailFont + 1,
      color: C.ink,
      lineHeight: 1.4,
      display: "-webkit-box",
      WebkitBoxOrient: "vertical",
      WebkitLineClamp: 2,
      overflow: "hidden",
    };
    return (
      <div
        style={{
          ...style,
          ...cardBase,
          display: "grid",
          gridTemplateColumns: "220px 1fr 1fr",
          alignItems: "center",
          gap: 18,
          padding: "0 26px",
        }}
      >
        <b style={{ fontFamily: F.zhSans, fontSize: detailFont, color: C.gray }}>{row.dim}</b>
        <span style={{ ...cell, color: tone, fontFamily: F.zhSerifSemi }}>{row.a}</span>
        <span style={{ ...cell, color: tone, fontFamily: F.zhSerifSemi }}>{row.b}</span>
      </div>
    );
  }

  // matrixHead / matrixRow：对照矩阵网格（维度列 + 2-4 概念列）
  const isHead = row.kind === "matrixHead";
  return (
    <div
      style={{
        ...style,
        display: "grid",
        gridTemplateColumns: `180px repeat(${Math.max(row.cells.length - 1, 1)}, 1fr)`,
        alignItems: "center",
        gap: 12,
        padding: "0 22px",
        borderRadius: 16,
        border: `2px solid ${isHead ? withAlpha(tone, 0.45) : C.line}`,
        background: isHead ? withAlpha(tone, 0.12) : C.surface,
        opacity: isHead ? headProgress : enter,
        transform: isHead
          ? `translateY(${interpolate(headProgress, [0, 1], [28, 0])}px)`
          : style.transform,
      }}
    >
      {row.cells.map((cellText, cellIndex) => (
        <span
          key={`${cellIndex}-${cellText}`}
          style={{
            fontFamily: cellIndex === 0 ? F.zhSans : F.zhSerifSemi,
            fontSize: cellIndex === 0 ? detailFont : detailFont + 1,
            fontWeight: isHead || cellIndex === 0 ? 700 : 400,
            color: cellIndex === 0 ? C.gray : isHead ? tone : C.ink,
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 3,
            overflow: "hidden",
            opacity: isHead ? 1 : cellIndex === 0 ? 1 : revealed ? 1 : 0.4,
          }}
        >
          {cellText}
        </span>
      ))}
    </div>
  );
};
