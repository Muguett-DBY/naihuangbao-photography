import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RiseText, StepShell } from "../Animated";
import { tellTerm } from "../../../../lib/law-quiz";
import type { StepProps } from "./types";

/** 普通段落型：逐句揭示 → 点按关键词标记理解 */
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
  const [revealed, setRevealed] = useState(false);
  const doneRef = useRef(false);
  const done = targets.length === 0 || (revealed && found.filter(Boolean).length >= targets.length);

  // 没有关键词可点时，看完即算完成
  useEffect(() => {
    if (targets.length === 0 && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }, [targets, onDone]);

  function foundTerm(index: number) {
    setFound((prev) => {
      const next = prev.map((value, i) => (i === index ? true : value));
      if (next.filter(Boolean).length >= targets.length && !doneRef.current) {
        doneRef.current = true;
        window.setTimeout(() => onDone(), 300);
      }
      return next;
    });
  }

  return (
    <StepShell
      eyebrow="📝 细读型 · 慢慢来"
      title={<RiseText text={step.text} onAnimationEnd={() => setRevealed(true)} />}
      hint={
        revealed && targets.length > 0 && !done
          ? `👆 点一下浮现的关键词（${found.filter(Boolean).length}/${targets.length}）确认理解`
          : undefined
      }
      done={done}
      doneLabel={targets.length > 0 ? "关键词都点过，理解了 ✓" : "已读完 ✓"}
    >
      {targets.length > 0 ? (
        <div className="law-plain__terms">
          {targets.map((term, index) => (
            <motion.button
              key={term}
              type="button"
              className={`law-plain__term ${found[index] ? "is-found" : ""}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={revealed ? { scale: 1, opacity: 1 } : {}}
              transition={{ delay: index * 0.16 }}
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
