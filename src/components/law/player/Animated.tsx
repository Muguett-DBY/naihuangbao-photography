import { motion } from "framer-motion";
import { useMemo, useState, useCallback, type CSSProperties, type ReactNode } from "react";

const spring = { type: "spring", stiffness: 360, damping: 28 } as const;

/** 逐块平稳揭示的文本（按 2 字一组轻柔上滑，无模糊无闪烁） */
export function RiseText({
  text,
  stagger = 0.02,
  delay = 0,
  className,
  highlight,
  onAnimationEnd,
}: {
  text: string;
  stagger?: number;
  delay?: number;
  className?: string;
  highlight?: (index: number, chunk: string) => boolean;
  onAnimationEnd?: () => void;
}) {
  const chunks = useMemo(() => {
    const out: string[] = [];
    // 保留标点，与前面一块一起出现
    const units = Array.from(text);
    let buffer = "";
    for (const char of units) {
      buffer += char;
      if (/[，。；：、！？）」”》]/.test(char)) {
        out.push(buffer);
        buffer = "";
        continue;
      }
      if (buffer.length >= 2) {
        out.push(buffer);
        buffer = "";
      }
    }
    if (buffer) out.push(buffer);
    return out;
  }, [text]);

  return (
    <span className={`law-rise-text ${className ?? ""}`} aria-label={text}>
      {chunks.map((chunk, index) => (
        <motion.span
          key={`${index}-${chunk}`}
          className={highlight?.(index, chunk) ? "is-highlight" : undefined}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: "easeOut", delay: delay + index * stagger }}
          onAnimationComplete={index === chunks.length - 1 ? onAnimationEnd : undefined}
        >
          {chunk}
        </motion.span>
      ))}
    </span>
  );
}

/** 弹出卡片（列表项等） */
export function PopCard({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.82, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ...spring, delay }}
    >
      {children}
    </motion.div>
  );
}

/** 关键词胶囊（点击弹解释） */
export function TermChip({
  term,
  note,
  accent,
  accentSoft,
  onClick,
  dim,
  children,
}: {
  term: string;
  note?: string;
  accent: string;
  accentSoft: string;
  onClick?: () => void;
  dim?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => {
    setOpen((value) => !value);
    onClick?.();
  }, [onClick]);
  return (
    <span className={`law-term ${dim ? "is-dim" : ""}`}>
      <button
        type="button"
        className={`law-term__chip ${open ? "is-open" : ""}`}
        style={{ "--law-accent": accent, "--law-accent-soft": accentSoft } as CSSProperties}
        onClick={toggle}
        aria-expanded={open}
      >
        {children ?? term}
      </button>
      <motion.span
        className="law-term__note"
        initial={false}
        animate={open ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.18 }}
      >
        {note ?? `「${term}」——书中的关键词，上文已经讲过它啦`}
      </motion.span>
    </span>
  );
}

/** 通用流程容器 */
export function StepShell({
  eyebrow,
  title,
  children,
  hint,
  done,
  doneLabel,
}: {
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
  hint?: string;
  done?: boolean;
  doneLabel?: string;
}) {
  return (
    <div className={`law-step ${done ? "is-done" : ""}`}>
      <header className="law-step__head">
        <span className="law-step__eyebrow">{eyebrow}</span>
        <div className="law-step__title">{title}</div>
      </header>
      <div className="law-step__body">{children}</div>
      {hint ? (
        <motion.p
          key={done ? "done" : "hint"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`law-step__hint ${done ? "is-done" : ""}`}
          aria-live="polite"
        >
          {done ? (doneLabel ?? "这一步完成啦 ✓") : hint}
        </motion.p>
      ) : null}
    </div>
  );
}
