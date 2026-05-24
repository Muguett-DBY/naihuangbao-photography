import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function useHorizontalScroll(
  sectionRef: RefObject<HTMLElement | null>,
  trackRef: RefObject<HTMLElement | null>,
) {
  const killRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    let cancelled = false;

    Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
    ]).then(([gsapMod, stMod]) => {
      if (cancelled) return;
      const gsap = gsapMod.default;
      const ScrollTrigger = stMod.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const trackWidth = track.scrollWidth;
      const viewportW = window.innerWidth;
      const dist = Math.min(0, viewportW - trackWidth);

      const tween = gsap.fromTo(
        track,
        { x: 0 },
        {
          x: dist - 40,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${trackWidth - viewportW + 80}`,
            scrub: 1.2,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        },
      );

      ScrollTrigger.refresh();

      killRef.current = () => {
        tween.kill();
        ScrollTrigger.getAll().forEach((st: any) => st.kill());
      };
    });

    return () => {
      cancelled = true;
      if (killRef.current) killRef.current();
    };
  }, [sectionRef, trackRef]);
}
