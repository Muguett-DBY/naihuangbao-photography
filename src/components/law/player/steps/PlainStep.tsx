import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RiseText, StepShell, SentenceLines } from "../Animated";
import { tellTerm } from "../../../../lib/law-quiz";
import type { StepProps } from "./types";

/**
 * 普通段落型：读就是任务，进入即算完成。
 * 关键词点按是"可选"的主动回忆互动——绝不阻断继续学习
 * （此前长文本步骤的关键词隐藏且永不解锁，用户会被死死卡住）。
 */

const PARAGRAPH_THRESHOLD = 120;

/** 长文自动分段：按句切分、每段约 2-3 句（≤56 字），配呼吸感行距 */
function splitParagraphs(text: string, maxChars = 56): string[] {
  const sentences = text.split(/(?<=[。；！？])/).map((line) => line.trim()).filter(Boolean);
  if (sentences.length <= 1) return [text];
  const paragraphs: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    if (buffer && buffer.length + sentence.length > maxChars) {
      paragraphs.push(buffer);
      buffer = sentence;
    } else {
      buffer += sentence;
    }
  }
  if (buffer) paragraphs.push(buffer);
  return paragraphs.length > 0 ? paragraphs : [text];
}

/** 段落内的关键词高亮：把命中的术语加粗为主题色 */
function highlightTerms(line: string, terms: string[]): ReactNode {
  let content: ReactNode = line;
  for (const term of terms) {
    if (!term || term.length < 2 || !line.includes(term)) continue;
    const parts: string[] = contentToString(content).split(term);
    if (parts.length < 2) continue;
    content = parts.map((part: string, index: number): ReactNode => (
      <span key={`${index}-${term}`}>
        {part}
        {index < parts.length - 1 ? <b className="law-sentences__term">{term}</b> : null}
      </span>
    ));
  }
  return content;
}

function contentToString(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(contentToString).join("");
  return "";
}

/** 长文（>120 字）分段落渲染：段落逐块浮现 + 呼吸感间距 */
function PlainParagraphs({ text, terms }: { text: string; terms: string[] }) {
  const reducedMotion = useReducedMotion();
  const paragraphs = useMemo(() => splitParagraphs(text), [text]);
  return (
    <span className="law-plain__paragraphs">
      {paragraphs.map((paragraph, index) => (
        <motion.span
          key={`${index}-${paragraph.slice(0, 6)}`}
          className="law-plain__paragraph"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.36, delay: index * 0.14, ease: "easeOut" }}
        >
          {highlightTerms(paragraph, terms)}
        </motion.span>
      ))}
    </span>
  );
}

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

  const title =
    step.text.length > PARAGRAPH_THRESHOLD ? (
      <PlainParagraphs text={step.text} terms={(step.terms ?? []).map((t) => t.term)} />
    ) : step.text.length > 60 ? (
      <SentenceLines text={step.text} terms={(step.terms ?? []).map((t) => t.term)} />
    ) : (
      <RiseText text={step.text} />
    );

  return (
    <StepShell
      eyebrow="📝 细读型 · 慢慢来"
      title={title}
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
