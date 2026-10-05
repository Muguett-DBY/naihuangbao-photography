import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * 奶黄包老师的头像 + 语音气泡。
 * 讲课稿逐字打出（打字机效果），配 Tailwind 级别的微动画。
 * respects reduced-motion（不做逐字动画，直接展示全文）。
 */
export function TeacherBubble({
  script,
  avatar = "🐱",
  name = "奶黄包",
  isSpeaking,
  compact = false,
}: {
  script: string;
  avatar?: string;
  name?: string;
  isSpeaking?: boolean;
  compact?: boolean;
}) {
  const [displayed, setDisplayed] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefersReduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // 打字机效果：逐字显示讲课稿
  useEffect(() => {
    if (!script) { setDisplayed(""); return; }
    if (prefersReduced.current) { setDisplayed(script); return; }

    setDisplayed("");
    let i = 0;
    timerRef.current = setInterval(() => {
      i += 1;
      setDisplayed(script.slice(0, i));
      if (i >= script.length && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 30);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [script]);

  return (
    <AnimatePresence>
      <div className={`law-teacher ${compact ? "law-teacher--compact" : ""}`} data-speaking={isSpeaking || undefined}>
        <div className="law-teacher__avatar" aria-hidden="true">
          <span className="law-teacher__face">{avatar}</span>
          {isSpeaking ? <span className="law-teacher__pulse" /> : null}
        </div>
        <div className="law-teacher__bubble" role="status" aria-live="polite" aria-label={`${name}老师说：${displayed}`}>
          <span className="law-teacher__name">{name}</span>
          <p className="law-teacher__text">
            {displayed}
            {displayed.length < script.length ? <span className="law-teacher__cursor">▌</span> : null}
          </p>
        </div>
      </div>
    </AnimatePresence>
  );
}
