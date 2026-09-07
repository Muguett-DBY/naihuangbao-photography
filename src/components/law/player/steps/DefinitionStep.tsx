import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { RiseText, TermChip, StepShell, SentenceLines } from "../Animated";
import { LawMascot } from "../../LawMascot";
import { tellTerm } from "../../../../lib/law-quiz";
import type { StepProps } from "./types";

/** 定义型步骤：逐句揭示 → 点按解锁关键词 */
export function DefinitionStep({ step, accent, accentSoft, onDone }: StepProps) {
  const [revealedText, setRevealedText] = useState(false);
  const [locked, setLocked] = useState(false);
  const doneRef = useRef(false);

  // 关键词必须真的出现在本句里：terms 是按"整块文本"提取的，
  // 长步骤按句切分后术语可能不在当前句——展示一个句子里没有的词只会误导
  const termEntry = step.terms?.find((t) => t.term && step.text.includes(t.term));
  const target = termEntry?.term ?? tellTerm(step.text) ?? "";
  const targetNote = termEntry?.note;

  function complete() {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }

  // 长文本走 SentenceLines 渲染，没有逐句动画回调——定时解锁，
  // 否则解锁按钮一直保持 opacity:0 不可点，步骤永远无法完成
  useEffect(() => {
    const timer = window.setTimeout(() => setRevealedText(true), 1100);
    return () => window.clearTimeout(timer);
  }, []);

  // 提取不出关键词的定义步骤：没有任何交互可做，挂载即完成（否则死锁）
  useEffect(() => {
    if (!target) complete();
  }, [target]);

  return (
    <StepShell
      eyebrow="📖 定义型 · 先理解"
      title={
        step.text.length > 60 ? (
          <SentenceLines text={step.text} terms={(step.terms ?? []).map((t) => t.term)} />
        ) : (
          <RiseText text={step.text} onAnimationEnd={() => setRevealedText(true)} />
        )
      }
      hint={
        revealedText && !locked && target
          ? "👆 这句话里藏着一个核心词——点「解锁关键词」看看是什么"
          : undefined
      }
      done={locked || !target}
      doneLabel={target ? "关键词已解锁 ✓" : "已读完，这句话记牢了 ✓"}
    >
      <div className="law-definition">
        <motion.div
          className="law-definition__term"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={revealedText ? { scale: 1, opacity: 1 } : {}}
        >
          {target ? (
            locked ? (
              <TermChip
                term={target}
                note={targetNote}
                accent={accent}
                accentSoft={accentSoft}
              />
            ) : (
              <button
                type="button"
                className="law-definition__lock"
                style={{ "--law-accent": accent } as CSSProperties}
                onClick={() => {
                  setLocked(true);
                  complete();
                }}
              >
                ❓ 解锁关键词
              </button>
            )
          ) : (
            <span className="law-definition__plain">这句话要记牢哦！</span>
          )}
        </motion.div>
        {target ? (
          <motion.div
            className="law-definition__affix"
            initial={{ opacity: 0 }}
            animate={locked ? { opacity: 1 } : {}}
          >
            <LawMascot mood="cheer" size={44} />
            <span>关键词「{target}」已记住！</span>
          </motion.div>
        ) : null}
      </div>
    </StepShell>
  );
}
