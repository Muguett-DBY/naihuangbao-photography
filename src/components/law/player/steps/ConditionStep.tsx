import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { PopCard, StepShell } from "../Animated";
import type { StepProps } from "./types";

/** 要件型步骤：清单逐项点亮，全部勾选 → 达成掌握 */
export function ConditionStep({ step, accent, accentSoft, onDone }: StepProps) {
  const items = (step.parts?.length ? step.parts : [step.text]).slice(0, 8);
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));
  const [pop, setPop] = useState(false);
  const doneRef = useRef(false);
  const doneTimerRef = useRef<number | null>(null);

  // 完成 onDone 的延时句柄要可清理：卸载（换步/退出课）后不得再触发
  useEffect(
    () => () => {
      if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current);
    },
    [],
  );

  const doneCount = checked.filter(Boolean).length;
  const allDone = doneCount === items.length;

  function toggle(index: number) {
    // 副作用不进 state updater（updater 需保持纯函数）：先算 next，再在 updater 外做完成判定
    const next = checked.map((value, i) => (i === index ? !value : value));
    setChecked(next);
    if (next.filter(Boolean).length >= items.length && !doneRef.current) {
      doneRef.current = true;
      setPop(true);
      doneTimerRef.current = window.setTimeout(() => onDone(), 650);
    }
  }

  return (
    <StepShell
      eyebrow="🔑 要件型 · 缺一不可"
      title={items.length === 1 ? "成立要件 · 一条都不能少" : `成立要件 · ${items.length} 项，缺一不可`}
      hint={
        allDone ? undefined : `👆 点一下卡片，确认你理解了这条要件（${doneCount}/${items.length}）`
      }
      done={allDone}
      doneLabel="要件齐备，判定成立 ✓"
    >
      <ul
        className="law-condition"
        style={{ "--law-accent": accent, "--law-accent-soft": accentSoft } as CSSProperties}
      >
        {items.map((item, index) => {
          const isChecked = checked[index] ?? false;
          return (
            <li key={`${index}-${item.slice(0, 8)}`}>
              <PopCard delay={index * 0.12}>
                <button
                  type="button"
                  className={`law-condition__item ${isChecked ? "is-checked" : ""}`}
                  onClick={() => toggle(index)}
                  aria-pressed={isChecked}
                >
                  <span className="law-condition__box" aria-hidden="true">
                    {isChecked ? (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      >
                        ✓
                      </motion.span>
                    ) : (
                      "□"
                    )}
                  </span>
                  <span className="law-condition__text">{item}</span>
                </button>
              </PopCard>
            </li>
          );
        })}
      </ul>
      {pop ? (
        <motion.div
          className="law-condition__pop"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 16 }}
        >
          🎉 要件齐了！"成立"达成
        </motion.div>
      ) : null}
    </StepShell>
  );
}
