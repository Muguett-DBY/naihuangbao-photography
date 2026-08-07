import { useEffect, useRef } from "react";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let frame = 0;
    let settledFrames = 0;
    let targetX = 0;
    let targetY = 0;
    let ringX = 0;
    let ringY = 0;
    let initialized = false;

    const animateRing = () => {
      frame = 0;
      const deltaX = targetX - ringX;
      const deltaY = targetY - ringY;
      ringX += deltaX * 0.18;
      ringY += deltaY * 0.18;
      ring.style.transform = `translate3d(${ringX - 16}px, ${ringY - 16}px, 0)`;

      if (Math.abs(deltaX) < 0.12 && Math.abs(deltaY) < 0.12) settledFrames += 1;
      else settledFrames = 0;
      if (settledFrames < 4 && !document.hidden) frame = window.requestAnimationFrame(animateRing);
    };

    const requestRingFrame = () => {
      if (frame === 0) frame = window.requestAnimationFrame(animateRing);
    };

    const handleMove = (event: MouseEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!initialized) {
        ringX = targetX;
        ringY = targetY;
        initialized = true;
      }
      settledFrames = 0;
      dot.style.transform = `translate3d(${targetX - 3}px, ${targetY - 3}px, 0)`;

      const target = event.target instanceof Element ? event.target : null;
      const clickable = target?.closest("a, button, [role='button'], input, select, textarea, label, .gallery-card, .package-card, .why-card");
      const image = target?.closest("img, .img-blur-wrap, .gallery-image-placeholder");
      ring.classList.toggle("is-clickable", Boolean(clickable));
      ring.classList.toggle("is-image", Boolean(image));
      requestRingFrame();
    };

    const handleWindowLeave = () => {
      dot.dataset.visible = "false";
      ring.dataset.visible = "false";
    };
    const handleWindowEnter = () => {
      dot.dataset.visible = "true";
      ring.dataset.visible = "true";
    };

    document.addEventListener("mousemove", handleMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", handleWindowLeave);
    document.documentElement.addEventListener("mouseenter", handleWindowEnter);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.documentElement.removeEventListener("mouseleave", handleWindowLeave);
      document.documentElement.removeEventListener("mouseenter", handleWindowEnter);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="nhb-cursor-dot" data-visible="true" aria-hidden="true" />
      <div ref={ringRef} className="nhb-cursor-ring" data-visible="true" aria-hidden="true" />
    </>
  );
}
