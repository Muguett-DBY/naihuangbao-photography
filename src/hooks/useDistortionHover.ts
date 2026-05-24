import { useEffect, useRef, type RefObject } from "react";

/**
 * Applies subtle 3D tilt distortion to [data-distort] children
 * on mouse move. All animation is CSS-driven — no RAF loops.
 */
export function useDistortionHover(): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const onMove = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-distort]") as HTMLElement | null;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      target.style.setProperty("--distort-x", String(x));
      target.style.setProperty("--distort-y", String(y));
    };

    const onLeave = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-distort]") as HTMLElement | null;
      if (!target) return;
      target.style.removeProperty("--distort-x");
      target.style.removeProperty("--distort-y");
    };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);

    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return ref;
}
