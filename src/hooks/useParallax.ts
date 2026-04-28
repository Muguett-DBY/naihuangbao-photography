import { useEffect, useRef, useState } from "react";

export function useParallax(speed = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const rafRef = useRef(0);
  const lastOffsetRef = useRef(0);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compactViewportQuery = window.matchMedia("(max-width: 620px)");

    function shouldDisableMotion() {
      return reducedMotionQuery.matches || compactViewportQuery.matches;
    }

    function updateOffset(nextOffset: number) {
      if (Math.abs(nextOffset - lastOffsetRef.current) < 1) return;
      lastOffsetRef.current = nextOffset;
      setOffset(nextOffset);
    }

    function onScroll() {
      if (shouldDisableMotion()) {
        updateOffset(0);
        return;
      }

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const scrolled = window.innerHeight - rect.top;
        const nextOffset = scrolled > 0 && rect.bottom > 0 ? scrolled * speed * 0.1 : 0;
        updateOffset(nextOffset);
      });
    }

    function onMotionPreferenceChange() {
      cancelAnimationFrame(rafRef.current);
      onScroll();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    reducedMotionQuery.addEventListener("change", onMotionPreferenceChange);
    compactViewportQuery.addEventListener("change", onMotionPreferenceChange);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      reducedMotionQuery.removeEventListener("change", onMotionPreferenceChange);
      compactViewportQuery.removeEventListener("change", onMotionPreferenceChange);
      cancelAnimationFrame(rafRef.current);
    };
  }, [speed]);

  return { ref, offset };
}
