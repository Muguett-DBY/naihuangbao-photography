import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { StepShell } from "../Animated";
import { LawMascot } from "../../LawMascot";
import type { StepProps } from "./types";

/** 口诀自测模式持久化：两种背法（翻卡 / 遮罩自测），选择跟着用户走 */
const MODE_STORE_KEY = "nhb-law-mnemonic-mode";
type MnemonicMode = "flip" | "quiz";

function readMode(): MnemonicMode {
  try {
    return localStorage.getItem(MODE_STORE_KEY) === "quiz" ? "quiz" : "flip";
  } catch {
    return "flip";
  }
}

function toChars(text: string): string[] {
  return Array.from(text.replace(/[\s，。；、]/g, "")).slice(0, 18);
}

/** 口诀型步骤：逐字翻开 → 遮住背一遍（点字开卡）；「遮罩自测」全程盖住凭记忆揭示 */
export function MnemonicStep({ step, accent, accentSoft, onDone }: StepProps) {
  const reducedMotion = useReducedMotion();
  const mnemonic = useMemo(() => {
    const raw = step.mnemonic ?? step.parts?.[0] ?? step.text;
    const found = raw.match(/[：:]\s*([^。；\n]+)/);
    return (found?.[1] ?? raw).trim();
  }, [step]);
  const chars = useMemo(() => toChars(mnemonic), [mnemonic]);
  const [mode, setMode] = useState<MnemonicMode>(readMode);
  const [flipped, setFlipped] = useState<boolean[]>(() => chars.map(() => false));
  const [memorizing, setMemorizing] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const doneRef = useRef(false);

  const revealedCount = flipped.filter(Boolean).length;
  const done = chars.length > 0 && revealedCount >= chars.length;

  function switchMode(next: MnemonicMode) {
    setMode(next);
    try {
      localStorage.setItem(MODE_STORE_KEY, next);
    } catch {
      // localStorage 不可用：模式仅本次会话内生效
    }
    // 换模式 = 重新开始一遍，完成判定也不复用
    setFlipped(chars.map(() => false));
    setMemorizing(false);
    setPeeking(false);
    doneRef.current = false;
  }

  function startMemorize() {
    setMemorizing(true);
    setFlipped(chars.map(() => false));
    setPeeking(false);
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

  // 偷看提示：短暂展示全文后重新盖上（自测模式专属，纯视觉）
  function peek() {
    if (!memorizing || done) return;
    setPeeking(true);
    window.setTimeout(() => setPeeking(false), 1300);
  }

  // 挂载时若不处于自测流程，先当"浏览"处理：不阻断完成（与翻卡模式的浏览一致）
  useEffect(() => {
    if (chars.length === 0 && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }, [chars.length, onDone]);

  return (
    <StepShell
      eyebrow="🧠 口诀型 · 记得快"
      title="口诀记忆卡"
      hint={
        !memorizing
          ? mode === "quiz"
            ? "👇 先默读一遍，再点「开始自测」全部盖住"
            : "👇 先看一遍口诀，再点「背一遍」遮住它"
          : mode === "quiz"
            ? `🤫 心里默背，再逐字点开对照（${revealedCount}/${chars.length}）；背不准可偷看一眼`
            : `👆 把遮住的字一个个点开（${revealedCount}/${chars.length}），凭记忆点！`
      }
      done={!memorizing || done}
      doneLabel={mode === "quiz" ? "自测对照完成，全对才算赢！✓" : "口诀背出来啦！✓"}
    >
      <div
        className="law-mnemonic"
        style={{ "--law-accent": accent, "--law-accent-soft": accentSoft } as CSSProperties}
      >
        <div
          className="law-mnemonic__modes"
          role="group"
          aria-label="背法切换"
        >
          <button
            type="button"
            className={mode === "flip" ? "is-active" : ""}
            aria-pressed={mode === "flip"}
            onClick={() => switchMode("flip")}
          >
            🃏 翻卡
          </button>
          <button
            type="button"
            className={mode === "quiz" ? "is-active" : ""}
            aria-pressed={mode === "quiz"}
            onClick={() => switchMode("quiz")}
          >
            🙈 遮罩自测
          </button>
        </div>
        {step.mnemonic ? (
          <p className="law-mnemonic__note">{step.text}</p>
        ) : null}
        <div className="law-mnemonic__title">记：</div>
        {mode === "quiz" && peeking && memorizing ? (
          <p className="law-mnemonic__peek" aria-label={mnemonic}>
            {mnemonic}
          </p>
        ) : (
          <div className="law-mnemonic__glyphs" aria-label={mnemonic}>
            {chars.map((char, index) => {
              // 浏览态要能"先看一遍口诀"：未进入背诵流程时全部可见，
              // 只有盖住之后才逐字揭示（此前浏览态显示一排？，与引导文案矛盾）
              const visible = flipped[index] || !memorizing;
              return (
                <motion.button
                  key={`${index}-${char}`}
                  type="button"
                  className={`law-mnemonic__glyph ${visible ? "is-open" : "is-hidden"}`}
                  initial={{ rotateY: 0 }}
                  animate={flipped[index] ? { rotateY: 360 } : { rotateY: 0 }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.32 }}
                  onClick={() => flip(index)}
                  disabled={!memorizing || flipped[index]}
                >
                  {visible ? (
                    <span>{char}</span>
                  ) : (
                    <span aria-hidden="true">?</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
        {!memorizing ? (
          <button type="button" className="law-mnemonic__go" onClick={startMemorize}>
            {mode === "quiz" ? "🙈 开始自测（全部盖住）" : "🎯 背一遍"}
          </button>
        ) : (
          <div className="law-mnemonic__actions">
            <button type="button" className="law-mnemonic__go is-plain" onClick={startMemorize}>
              🔄 重来
            </button>
            {mode === "quiz" && !done ? (
              <button type="button" className="law-mnemonic__go is-plain" onClick={peek}>
                👀 偷看一眼
              </button>
            ) : null}
          </div>
        )}
        {/* 口诀完成的表情反馈：小助手出来庆祝 */}
        <AnimatePresence>
          {memorizing && done ? (
            <motion.div
              className="law-mnemonic__cheer"
              initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 18 }}
            >
              <LawMascot mood="cheer" size={44} />
              <span>{mode === "quiz" ? "自测全部对上，口诀拿下！" : "口诀点亮完成！"}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </StepShell>
  );
}
