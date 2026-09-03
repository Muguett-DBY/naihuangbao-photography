import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { LawGraphic } from "../../../types/law";

const CORNERS: { top: string; left: string; from: [number, number] }[] = [
  { top: "8%", left: "6%", from: [-260, -180] },
  { top: "8%", left: "62%", from: [260, -180] },
  { top: "55%", left: "6%", from: [-260, 180] },
  { top: "55%", left: "62%", from: [260, 180] },
];

/** 装配动画：要素从四方飞入，归位拼成完整概念（犯罪构成 / 法律关系） */
export function AssembleDiagram({ graphic, active }: { graphic: LawGraphic; active: number }) {
  const parts = graphic.nodes.filter((node) => node.parent !== 0).slice(0, 4);
  const core = graphic.nodes.find((node) => node.parent === 0);
  const visibleCount = Math.min(active + 1, parts.length + 1);

  return (
    <div className="dia-assemble" aria-live="polite">
      <div className="dia-assemble__canvas">
        {/* 四角零件：外层定位，内层动画 */}
        {parts.map((part, index) => {
          const corner = CORNERS[index];
          const shown = index < visibleCount;
          return (
            <div key={part.label} className="dia-assemble__slot" style={{ top: corner.top, left: corner.left }}>
              <motion.div
                className="dia-assemble__part"
                initial={{ x: corner.from[0], y: corner.from[1], scale: 0.3, opacity: 0, rotate: -14 }}
                animate={shown ? { x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 } : { x: corner.from[0], y: corner.from[1], scale: 0.3, opacity: 0 }}
                transition={{ type: "spring", stiffness: 180, damping: 17 }}
              >
                <b>{part.label}</b>
                <small>{part.detail}</small>
              </motion.div>
            </div>
          );
        })}

        {/* 中心核心概念 */}
        <div className="dia-assemble__center">
          <motion.div
            className="dia-assemble__core"
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: visibleCount > parts.length ? 1.02 : 0, opacity: visibleCount > parts.length ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.15 }}
          >
            {core?.label}
            <small>{core?.detail}</small>
          </motion.div>
        </div>

        {/* 中心连线（中心→四角） */}
        <svg className="dia-assemble__wires" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {parts.map((part, index) => {
            const corner = CORNERS[index];
            const x2 = corner.left === "6%" ? 18 : 82;
            const y2 = corner.top === "8%" ? 30 : 74;
            const shown = index < visibleCount;
            return (
              <motion.line
                key={part.label}
                x1="50"
                y1="50"
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth="1.4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={shown ? { pathLength: 1, opacity: 0.5 } : { pathLength: 0, opacity: 0 }}
                transition={{ duration: 0.45, delay: index * 0.12 }}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export type { CSSProperties };
