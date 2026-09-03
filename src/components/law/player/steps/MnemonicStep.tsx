import { useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { StepShell } from "../Animated";
import type { StepProps } from "./types";

function toChars(text: string): string[] {
  return Array.from(text.replace(/[\s，。；、]/g, "")).slice(0, 18);
}

/** 口诀型步骤：逐字翻开 → 遮住背一遍（点字开卡） */
export function MnemonicStep({ step, accent, accentSoft, onDone }: StepProps) {
  const mnemonic = useMemo(() => {
    const raw = step.mnemonic ?? step.parts?.[0] ?? step.text;
    const found = raw.match(/[：:]\s*([^。；\n]+)/);
    return (found?.[1] ?? raw).trim();
  }, [step]);
  const chars = useMemo(() => toChars(mnemonic), [mnemonic]);
  const [flipped, setFlipped] = useState<boolean[]>(() => chars.map(() => false));
  const [memorizing, setMemorizing] = useState(false);
  const doneRef = useRef(false);

  const revealedCount = flipped.filter(Boolean).length;
  const done = chars.length > 0 && revealedCount >= chars.length;

  function startMemorize() {
    setMemorizing(true);
    setFlipped(chars.map(() => false));
  }

  function flip(index: number) {
    if (!memorizing) return;
    setFlipped((prev) => {
      const next = prev.map((value, i) => (i === index ? true : value));
      if (next.filter(Boolean).length >= chars.length && !doneRef.current) {
        doneRef.current = true;
        onDone();
      }
      return next;
    });
  }

  return (
    <StepShell
      eyebrow="🧠 口诀型 · 记得快"
      title="口诀记忆卡"
      hint={
        !memorizing
          ? "👇 先看一遍口诀，再点「背一遍」遮住它"
          : `👆 把遮住的字一个个点开（${revealedCount}/${chars.length}），凭记忆点！`
      }
      done={!memorizing || done}
      doneLabel="口诀背出来啦！✓"
    >
      <div
        className="law-mnemonic"
        style={{ "--law-accent": accent, "--law-accent-soft": accentSoft } as CSSProperties}
      >
        {step.mnemonic ? (
          <p className="law-mnemonic__note">{step.text}</p>
        ) : null}
        <div className="law-mnemonic__title">记：</div>
        <div className="law-mnemonic__glyphs" aria-label={mnemonic}>
          {chars.map((char, index) => (
            <motion.button
              key={`${index}-${char}`}
              type="button"
              className={`law-mnemonic__glyph ${flipped[index] ? "is-open" : "is-hidden"}`}
              initial={{ rotateY: 0 }}
              animate={flipped[index] ? { rotateY: 360 } : { rotateY: 0 }}
              transition={{ duration: 0.32 }}
              onClick={() => flip(index)}
              disabled={!memorizing || flipped[index]}
            >
              {flipped[index] ? (
                <span>{char}</span>
              ) : (
                <span aria-hidden="true">?</span>
              )}
            </motion.button>
          ))}
        </div>
        {!memorizing ? (
          <button type="button" className="law-mnemonic__go" onClick={startMemorize}>
            🎯 背一遍
          </button>
        ) : (
          <button type="button" className="law-mnemonic__go is-plain" onClick={startMemorize}>
            🔄 重来
          </button>
        )}
      </div>
    </StepShell>
  );
}
