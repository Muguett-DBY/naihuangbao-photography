import { useEffect, useRef } from "react";

export function useParallax(speed = 0.3) {
  const ref = useRef<HTMLElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastOffsetRef = useRef(0);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compactViewportQuery = window.matchMedia("(max-width: 620px)");

    function shouldDisableMotion() {
      return reducedMotionQuery.matches || compactViewportQuery.matches;
    }

    function writeOffset(nextOffset: number) {
      const el = ref.current;
      if (!el) return;
      if (Math.abs(nextOffset - lastOffsetRef.current) < 0.25) return;
      lastOffsetRef.current = nextOffset;
      el.style.setProperty("--parallax-offset", `${nextOffset.toFixed(2)}px`);
      el.querySelectorAll<HTMLElement>("[data-parallax-factor]").forEach((child) => {
        const factor = Number(child.dataset.parallaxFactor ?? 1) || 0;
        child.style.setProperty("--parallax-offset", `${(nextOffset * factor).toFixed(2)}px`);
      });
    }

    function scheduleUpdate() {
      if (rafRef.current !== null) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const el = ref.current;
        if (!el) return;

        if (shouldDisableMotion()) {
          writeOffset(0);
          return;
        }

        const rect = el.getBoundingClientRect();
        const scrolled = window.innerHeight - rect.top;
        const nextOffset = scrolled > 0 && rect.bottom > 0 ? scrolled * speed * 0.1 : 0;
        writeOffset(nextOffset);
      });
    }

    function onMotionPreferenceChange() {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastOffsetRef.current = Number.NaN;
      scheduleUpdate();
    }

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    reducedMotionQuery.addEventListener("change", onMotionPreferenceChange);
    compactViewportQuery.addEventListener("change", onMotionPreferenceChange);
    scheduleUpdate();
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      reducedMotionQuery.removeEventListener("change", onMotionPreferenceChange);
      compactViewportQuery.removeEventListener("change", onMotionPreferenceChange);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [speed]);

  return { ref };
}
