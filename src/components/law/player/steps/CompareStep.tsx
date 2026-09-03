import { useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { PopCard, StepShell } from "../Animated";
import { compareTitles, splitItems, type StepProps } from "./types";

/** 对比型步骤：双列动画 + 逐行翻开（同点 / 异点） */
export function CompareStep({ step, accent, accentSoft, onDone }: StepProps) {
  const [a, b] = compareTitles(step.text);
  const [revealed, setRevealed] = useState<boolean[]>(() => []);
  const doneRef = useRef(false);

  const same = step.compare?.same ?? [];
  const diff = step.compare?.diff ?? [];

  const rows = [
    ...same.map((text, i) => ({ id: `s-${i}`, group: "same" as const, label: "相同点", text })),
    ...diff.map((row, i) => ({ id: `d-${i}`, group: "diff" as const, label: row.label, a: row.a, b: row.b })),
  ];

  // 没有结构化 compare 时，就把各个要点做成"逐行翻开"
  if (same.length === 0 && diff.length === 0) {
    const parts = (step.parts?.length ? step.parts : splitItems(step.text)).slice(0, 6);
    if (parts.length < 2) {
      return (
        <StepShell eyebrow="⚖️ 对比型" title={step.text} done>
          <p className="law-note">请翻阅同页原始内容继续学习。</p>
        </StepShell>
      );
    }
    rows.length = 0;
    parts.forEach((part, i) => {
      rows.push({ id: `f-${i}`, group: "same" as const, label: `要点${i + 1}`, text: part });
    });
  }

  const done = rows.length > 0 && revealed.filter(Boolean).length >= rows.length;

  function revealRow(index: number) {
    setRevealed((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    if (!doneRef.current) {
      const all = rows.length;
      const count = revealed.filter(Boolean).length + 1;
      if (count >= all) {
        doneRef.current = true;
        onDone();
      }
    }
  }

  return (
    <StepShell
      eyebrow="⚖️ 对比型 · 分清异同"
      title={
        <span>
          <Rise aria={a} accent={accent} accentSoft={accentSoft} /> vs{" "}
          <Rise aria={b} accent={accent} accentSoft={accentSoft} />
        </span>
      }
      hint={
        done ? undefined : `👆 逐行点击翻开（${revealed.filter(Boolean).length}/${rows.length}），把异同点一个个看清`
      }
      done={done}
    >
      <div
        className="law-compare"
        style={{ "--law-accent": accent, "--law-accent-soft": accentSoft } as CSSProperties}
      >
        <div className="law-compare__heads">
          <span>{a}</span>
          <span>{b}</span>
        </div>
        {rows.map((row, index) => (
          <PopCard key={row.id} delay={index * 0.1}>
            <button
              type="button"
              className={`law-compare__row ${revealed[index] ? "is-open" : ""} is-${row.group}`}
              onClick={() => revealRow(index)}
              aria-expanded={!!revealed[index]}
            >
              <span className="law-compare__row-label">{row.label}</span>
              <motion.span
                className="law-compare__row-cells"
                initial={false}
                animate={{ opacity: revealed[index] ? 1 : 0.28 }}
              >
                {row.group === "same" ? (
                  <span className="law-compare__cell is-same">{row.text}</span>
                ) : (
                  <>
                    <span className="law-compare__cell law-compare__cell--a">{row.a}</span>
                    <span className="law-compare__cell law-compare__cell--b">{row.b}</span>
                  </>
                )}
              </motion.span>
              <span className="law-compare__row-toggle">{revealed[index] ? "✓" : "翻开"}</span>
            </button>
          </PopCard>
        ))}
      </div>
    </StepShell>
  );
}

function Rise({ aria, accent, accentSoft }: { aria: string; accent: string; accentSoft: string }) {
  return (
    <motion.span
      className="law-compare__axis"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ "--law-accent": accent, "--law-accent-soft": accentSoft } as CSSProperties}
    >
      {aria}
    </motion.span>
  );
}
