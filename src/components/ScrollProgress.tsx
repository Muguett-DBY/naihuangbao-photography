import { useEffect, useRef } from "react";

export function ScrollProgress() {
  const progressRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame: number | null = null;
    let lastPercent = -1;

    const update = () => {
      frame = null;
      const progress = progressRef.current;
      const bar = barRef.current;
      if (!progress || !bar) return;

      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollableHeight > 0
        ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight))
        : 0;
      const percent = Math.round(ratio * 100);
      bar.style.transform = `scaleX(${ratio})`;
      if (percent !== lastPercent) {
        progress.setAttribute("aria-valuenow", String(percent));
        lastPercent = percent;
      }
    };

    const requestUpdate = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    requestUpdate();

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={progressRef}
      className="scroll-progress"
      role="progressbar"
      aria-label="Page scroll progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
    >
      <div ref={barRef} className="scroll-progress-bar" />
    </div>
  );
}
