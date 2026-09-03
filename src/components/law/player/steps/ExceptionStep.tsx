import { useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { RiseText, StepShell } from "../Animated";
import type { StepProps } from "./types";

/** 例外型步骤：规则出现 → 红色"但书"滑入，点转折词抓住它 */
export function ExceptionStep({ step, accent, accentSoft, onDone }: StepProps) {
  const rule = step.pivot?.rule ?? step.text.split(/但|但是|除外|例外/)[0] ?? step.text;
  const except =
    step.pivot?.except ??
    step.text.match(/但(?:是)?[^。；]*(?:除外|例外)?[^。；]*/)?.[0] ??
    step.text;
  const [caught, setCaught] = useState(false);
  const [swiped, setSwiped] = useState(false);
  const doneRef = useRef(false);

  function catchPivot() {
    if (doneRef.current) return;
    doneRef.current = true;
    setCaught(true);
    onDone();
  }

  return (
    <StepShell
      eyebrow={'⚠️ 例外型 · 小心"但书"'}
      title="规则之外，必有例外"
      hint={
        swiped && !caught
          ? "👆 抓住滑进来的红色「但书」——点它就抓住了"
          : undefined
      }
      done={caught}
      doneLabel="但书抓住，例外记牢 ✓"
    >
      <div
        className="law-exception"
        style={{ "--law-accent": accent, "--law-accent-soft": accentSoft } as CSSProperties}
      >
        <div className="law-exception__rule">
          <span className="law-exception__tag">一般规则</span>
          <RiseText text={rule} />
        </div>
        <motion.div
          className="law-exception__but"
          initial={{ x: "-110%", opacity: 0 }}
          animate={{ x: "0%", opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={() => setSwiped(true)}
        >
          <button
            type="button"
            className={`law-exception__catch ${caught ? "is-caught" : ""}`}
            onClick={catchPivot}
            disabled={caught}
          >
            <span className="law-exception__but-word">{caught ? "但书" : "但书"}</span>
            <span className="law-exception__but-text">{except}</span>
          </button>
        </motion.div>
      </div>
    </StepShell>
  );
}
