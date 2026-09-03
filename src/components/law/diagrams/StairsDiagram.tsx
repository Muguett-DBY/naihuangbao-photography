import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { LawGraphic } from "../../../types/law";

/** 阶梯动画：台阶逐级升起，小人沿阶而上，亮起当前能力档位 */
export function StairsDiagram({ graphic, active }: { graphic: LawGraphic; active: number }) {
  const steps = graphic.nodes;
  const visible = Math.min(active + 1, steps.length);
  const activeStep = Math.min(active, steps.length - 1);

  return (
    <div className="dia-stairs" aria-live="polite">
      <div className="dia-stairs__canvas">
        {steps.map((step, index) => {
          const top = `${(index / Math.max(steps.length, 1)) * 100 + 8}%`;
          const shown = index < visible;
          return (
            <motion.div
              key={step.label}
              className={`dia-stairs__tier ${index === activeStep ? "is-active" : ""} ${shown ? "is-shown" : ""}`}
              style={{ top } as CSSProperties}
              initial={{ y: 64, opacity: 0 }}
              animate={shown ? { y: 0, opacity: 1 } : { y: 64, opacity: 0 }}
              transition={{ type: "spring", stiffness: 210, damping: 19 }}
            >
              <span className="dia-stairs__age">{step.step}</span>
              <b>{step.label}</b>
              {shown ? <small>{step.detail}</small> : null}
            </motion.div>
          );
        })}
        {/* 攀登小人 */}
        <motion.div
          className="dia-stairs__walker"
          animate={{ top: `${((activeStep + 1) / (steps.length + 1)) * 100}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 16 }}
        >
          <span aria-hidden="true">🧍</span>
        </motion.div>
      </div>
    </div>
  );
}
