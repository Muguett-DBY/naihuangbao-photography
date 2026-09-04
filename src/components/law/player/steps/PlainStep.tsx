import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RiseText, StepShell, SentenceLines } from "../Animated";
import { tellTerm } from "../../../../lib/law-quiz";
import type { StepProps } from "./types";

/**
 * 普通段落型：读就是任务，进入即算完成。
 * 关键词点按是"可选"的主动回忆互动——绝不阻断继续学习
 * （此前长文本步骤的关键词隐藏且永不解锁，用户会被死死卡住）。
 */
export function PlainStep({ step, accent, accentSoft, onDone }: StepProps) {
  const targets = useMemo(() => {
    const list: string[] = [];
    for (const term of step.terms ?? []) {
      if (term.term.length >= 2 && step.text.includes(term.term)) list.push(term.term);
    }
    const auto = tellTerm(step.text);
    if (auto && auto.length >= 2 && step.text.includes(auto) && !list.includes(auto)) {
      list.push(auto);
    }
    return list.slice(0, 3);
  }, [step]);
  const [found, setFound] = useState<boolean[]>(() => targets.map(() => false));
  const doneRef = useRef(false);

  // 读就是任务：挂载即完成，下一步始终可用
  useEffect(() => {
    if (!doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }, [onDone]);

  function foundTerm(index: number) {
    setFound((prev) => prev.map((value, i) => (i === index ? true : value)));
  }

  return (
    <StepShell
      eyebrow="📝 细读型 · 慢慢来"
      title={
        step.text.length > 60 ? (
          <SentenceLines text={step.text} terms={(step.terms ?? []).map((t) => t.term)} />
        ) : (
          <RiseText text={step.text} />
        )
      }
      hint={targets.length > 0 ? "👆 点关键词可标记「已理解」，直接下一步也完全可以" : undefined}
      done
      doneLabel="已读完 ✓"
    >
      {targets.length > 0 ? (
        <div className="law-plain__terms">
          {targets.map((term, index) => (
            <motion.button
              key={term}
              type="button"
              className={`law-plain__term ${found[index] ? "is-found" : ""}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 + index * 0.16 }}
              onClick={() => foundTerm(index)}
            >
              {found[index] ? `✓ ${term}` : `“${term}”`}
            </motion.button>
          ))}
        </div>
      ) : null}
    </StepShell>
  );
}
