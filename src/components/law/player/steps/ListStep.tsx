import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { PopCard, StepShell } from "../Animated";
import type { StepProps } from "./types";

/** 列举型步骤：逐条弹出 → 逐条点按自检（每条都必须点过） */
export function ListStep({ step, accent, accentSoft, onDone }: StepProps) {
  const items = (step.parts?.length ? step.parts : [step.text]).slice(0, 8);
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));
  const doneRef = useRef(false);

  const doneCount = checked.filter(Boolean).length;
  const allDone = doneCount === items.length;

  useEffect(() => {
    if (allDone && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }, [allDone, onDone]);

  return (
    <StepShell
      eyebrow="🗂️ 列举型 · 一条一条过"
      title={`共 ${items.length} 条，一条都别漏`}
      hint={
        allDone
          ? undefined
          : `👆 按顺序点每条卡片（已过 ${doneCount}/${items.length}），点完就算掌握`
      }
      done={allDone}
      doneLabel={`${items.length} 条全部点过，太棒了！✓`}
    >
      <ol className="law-list">
        {items.map((item, index) => {
          const isChecked = checked[index] ?? false;
          const canCheck = index === 0 || checked[index - 1];
          return (
            <li key={`${index}-${item.slice(0, 8)}`}>
              <PopCard delay={index * 0.14}>
                <button
                  type="button"
                  className={`law-list__item ${isChecked ? "is-checked" : ""} ${canCheck && !isChecked ? "is-next" : ""}`}
                  style={{ "--law-accent": accent, "--law-accent-soft": accentSoft } as CSSProperties}
                  disabled={!canCheck || isChecked}
                  onClick={() => {
                    setChecked((prev) => prev.map((value, i) => (i === index ? true : value)));
                  }}
                >
                  <span className="law-list__no">{String(index + 1).padStart(2, "0")}</span>
                  <span className="law-list__text">{item}</span>
                  <span className="law-list__mark" aria-hidden="true">
                    {isChecked ? "✓" : canCheck ? "☐" : "🔒"}
                  </span>
                </button>
              </PopCard>
            </li>
          );
        })}
      </ol>
    </StepShell>
  );
}
