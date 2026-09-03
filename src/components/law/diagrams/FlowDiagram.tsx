import { motion } from "framer-motion";
import type { LawGraphic } from "../../../types/law";

/** 流程动画：节点沿"之"字路线依次点亮，连接线逐段生长，最终汇聚 */
export function FlowDiagram({ graphic, active }: { graphic: LawGraphic; active: number }) {
  const nodes = graphic.nodes;
  const visible = Math.min(active + 1, nodes.length);

  // 之字形路径坐标（纵向 5 级）
  const stepY = () => {
    const count = nodes.length;
    return count > 1 ? 200 / (count - 1) : 200;
  };

  const pointAt = (index: number) => {
    const y = 24 + index * stepY();
    const x = index % 2 === 0 ? 86 : 214;
    return { x, y };
  };

  return (
    <div className="dia-flow" aria-live="polite">
      <svg viewBox="0 0 300 260" className="dia-flow__svg">
        {nodes.map((node, index) => {
          const from = index === 0 ? pointAt(0) : pointAt(index - 1);
          const to = pointAt(index);
          const shown = index < visible;
          return (
            <g key={node.label}>
              <motion.line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="currentColor"
                strokeWidth="2.4"
                strokeDasharray="6 5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={shown ? { pathLength: 1, opacity: 0.55 } : { pathLength: 0, opacity: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
              />
              <motion.g
                initial={{ scale: 0, opacity: 0 }}
                animate={shown ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 17, delay: 0.22 }}
                style={{ transformOrigin: `${to.x}px ${to.y}px` }}
              >
                <circle cx={to.x} cy={to.y} r="15" fill="var(--law-accent-soft, #f6e5e2)" stroke="var(--law-accent, #b1544e)" strokeWidth="2" />
                <text x={to.x} y={to.y + 5} textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--law-accent, #b1544e)">
                  {index + 1}
                </text>
              </motion.g>
              <motion.text
                x={to.x}
                y={to.y - 24}
                textAnchor="middle"
                fontSize="12"
                fontWeight="800"
                fill="var(--ink)"
                initial={{ opacity: 0 }}
                animate={shown ? { opacity: 1 } : {}}
                transition={{ delay: 0.3 }}
              >
                {node.label}
              </motion.text>
            </g>
          );
        })}
      </svg>

      <motion.div
        className="dia-flow__detail"
        key={Math.min(active, nodes.length - 1)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
      >
        <b>{nodes[Math.min(active, nodes.length - 1)]?.label}</b>
        <span>{nodes[Math.min(active, nodes.length - 1)]?.detail}</span>
      </motion.div>
    </div>
  );
}
