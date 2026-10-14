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
  const prefersReduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // 打字机效果：逐字显示讲课稿。rAF 按显示刷新对齐（30ms/字节奏不变），
  // 与 Remotion Player 自身的 rAF 渲染同帧调度，替代任意时刻触发的 setInterval
  // 逐字 setState（≈33 次/秒）在播放期与 30fps 整树重渲染抢主线程；
  // 字数没变的帧跳过 setState，reduced-motion 分支直出全文保持不变
  useEffect(() => {
    if (!script) { setDisplayed(""); return; }
    if (prefersReduced.current) { setDisplayed(script); return; }

    setDisplayed("");
    const CHAR_MS = 30;
    let frame = 0;
    let startedAt = 0;
    let shown = 0;
    const step = (now: number) => {
      if (!startedAt) startedAt = now;
      const count = Math.min(script.length, Math.floor((now - startedAt) / CHAR_MS) + 1);
      if (count !== shown) {
        shown = count;
        setDisplayed(script.slice(0, count));
      }
      if (count < script.length) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [script]);

  return (
    <AnimatePresence>
      <div className={`law-teacher ${compact ? "law-teacher--compact" : ""}`} data-speaking={isSpeaking || undefined}>
        <div className="law-teacher__avatar" aria-hidden="true">
          <span className="law-teacher__face">{avatar}</span>
          {isSpeaking ? <span className="law-teacher__pulse" /> : null}
        </div>
        {/* 打字机逐字增量若处于 live region，30ms 一次的变更会把读屏播报队列刷屏
            （课堂播放器另有 law-classroom-player__sronly 的 role=status 播报场景标题）：
            动画文本对读屏隐藏，讲课稿全文经 sr-only 静态可读（与 reduced-motion 分支同稿） */}
        <div className="law-teacher__bubble">
          <span className="law-teacher__name">{name}</span>
          <p className="law-teacher__text" aria-hidden="true">
            {displayed}
            {displayed.length < script.length ? <span className="law-teacher__cursor">▌</span> : null}
          </p>
          <span className="sr-only">{name}老师说：{script}</span>
        </div>
      </div>
    </AnimatePresence>
  );
}
