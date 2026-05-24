import { useCallback, useEffect, useRef } from "react";

export function useDistortionHover() {
  const containerRef = useRef<HTMLElement | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest("[data-distort]") as HTMLElement | null;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    const img = target.querySelector("img") || target;
    const intensity = 8;

    img.style.transform = `
      scale(1.04)
      perspective(600px)
      rotateX(${-y * intensity}deg)
      rotateY(${x * intensity}deg)
    `;
    img.style.filter = `brightness(${1.1 + (0.5 - Math.abs(y)) * 0.1}) saturate(1.05)`;
    img.style.transition = "none";
  }, []);

  const onMouseLeave = useCallback((e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest("[data-distort]") as HTMLElement | null;
    if (!target) return;
    const img = target.querySelector("img") || target;
    img.style.transform = "scale(1) perspective(600px) rotateX(0deg) rotateY(0deg)";
    img.style.filter = "brightness(1) saturate(1)";
    img.style.transition = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), filter 0.5s ease";
  }, []);

  useEffect(() => {
    const el = containerRef.current || document.body;
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseleave", onMouseLeave);
    return () => {
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [onMouseMove, onMouseLeave]);

  return containerRef;
}
