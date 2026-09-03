import { useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { StepShell } from "../Animated";
import type { StepProps } from "./types";

/** 流程型步骤：步骤节点依次点亮，用户点"下一步"走完全程 */
export function FlowStep({ step, accent, accentSoft, onDone }: StepProps) {
  const nodes = useMemo(() => {
    const parts = step.parts?.length
      ? step.parts
      : step.text
          .split(/[，、]/)
          .map((part) => part.trim())
          .filter((part) => part.length >= 2);
    return parts.slice(0, 6);
  }, [step]);
  const [reached, setReached] = useState(0);
  const doneRef = useRef(false);

  const done = nodes.length > 0 && reached >= nodes.length;

  function advance() {
    setReached((prev) => {
      const next = Math.min(prev + 1, nodes.length);
      if (next >= nodes.length && !doneRef.current) {
        doneRef.current = true;
        onDone();
      }
      return next;
    });
  }

  return (
    <StepShell
      eyebrow="🔗 流程型 · 一步一步来"
      title={`流程 · ${nodes.length} 步`}
      hint={
        done
          ? undefined
          : `👆 点「下一步」走完流程（已走到第 ${Math.min(reached + 1, nodes.length)} 步 / 共 ${nodes.length} 步）`
      }
      done={done}
      doneLabel="流程完整走通 ✓"
    >
      <div
        className="law-flow"
        style={{ "--law-accent": accent, "--law-accent-soft": accentSoft } as CSSProperties}
      >
        <ol className="law-flow__chain">
          {nodes.map((node, index) => {
            const isLit = index < reached;
            const isCurrent = index === reached;
            return (
              <motion.li
                key={`${index}-${node.slice(0, 8)}`}
                className={`law-flow__node ${isLit ? "is-lit" : ""} ${isCurrent ? "is-current" : ""}`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.12 }}
              >
                <motion.span
                  className="law-flow__ball"
                  animate={{
                    scale: isCurrent ? [1, 1.18, 1] : 1,
                    backgroundColor: isLit ? accent : "var(--paper)",
                  }}
                  transition={{ repeat: isCurrent ? Infinity : 0, duration: 1.1 }}
                >
                  {isLit ? "✓" : index + 1}
                </motion.span>
                <span className="law-flow__text">{node}</span>
              </motion.li>
            );
          })}
        </ol>
        {!done ? (
          <button type="button" className="law-flow__next" onClick={advance}>
            下一步 →
          </button>
        ) : (
          <motion.p
            className="law-flow__finish"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            🎊 全流程走完！
          </motion.p>
        )}
      </div>
    </StepShell>
  );
}
