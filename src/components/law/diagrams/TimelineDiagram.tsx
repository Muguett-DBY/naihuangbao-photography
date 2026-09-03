import { motion } from "framer-motion";
import type { LawGraphic } from "../../../types/law";

/** 时间轴动画：朝代旗帜沿轨道依次立起，色带与节点同步点亮 */
export function TimelineDiagram({ graphic, active }: { graphic: LawGraphic; active: number }) {
  const nodes = graphic.nodes;
  const visible = Math.min(active + 1, nodes.length);
  const progress = (visible / Math.max(nodes.length, 1)) * 100;

  return (
    <div className="dia-timeline" aria-live="polite">
      <div className="dia-timeline__track-wrap">
        <div className="dia-timeline__track">
          <div className="dia-timeline__base" />
          <motion.div
            className="dia-timeline__progress"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          {nodes.map((node, index) => {
            const left = `${(index + 0.5) / nodes.length * 100}%`;
            const shown = index < visible;
            const ring = (graphic.eras ?? []).some((era) => era.label === node.step)
              ? graphic.eras!.find((era) => era.label === node.step)!.color
              : "var(--law-accent, #b1544e)";
            return (
              <div className="dia-timeline__node" key={node.label} style={{ left }}>
                <motion.div
                  className="dia-timeline__flag"
                  initial={{ y: -46, opacity: 0, scale: 0.7 }}
                  animate={shown ? { y: 0, opacity: 1, scale: 1 } : { y: -46, opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 260, damping: 17 }}
                  style={{ "--era": ring } as React.CSSProperties}
                >
                  <b>{node.label}</b>
                  <small>{node.step}</small>
                </motion.div>
                <motion.span
                  className="dia-timeline__dot"
                  initial={{ scale: 0 }}
                  animate={shown ? { scale: 1 } : { scale: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 16 }}
                >
                  {index + 1}
                </motion.span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dia-timeline__eras" aria-hidden="true">
        {(graphic.eras ?? []).map((era) => (
          <span key={era.label} style={{ background: era.color }}>
            {era.label}
          </span>
        ))}
      </div>

      <motion.div
        className="dia-timeline__detail"
        key={Math.min(active, nodes.length - 1)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26 }}
      >
        <b>{nodes[Math.min(active, nodes.length - 1)]?.label}</b>
        <span>{nodes[Math.min(active, nodes.length - 1)]?.detail}</span>
      </motion.div>
    </div>
  );
}
