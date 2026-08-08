import { useEffect, useRef, type PropsWithChildren, type PointerEvent } from "react";

type SoftMagnetProps = PropsWithChildren<{
  className?: string;
  strength?: number;
}>;

export function SoftMagnet({ children, className = "", strength = 10 }: SoftMagnetProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);

  const reset = () => {
    const host = hostRef.current;
    if (!host) return;
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      host.style.setProperty("--soft-magnet-x", "0px");
      host.style.setProperty("--soft-magnet-y", "0px");
      frameRef.current = null;
    });
  };

  const handlePointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const host = hostRef.current;
    if (!host) return;
    const bounds = host.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * strength;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * strength;

    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      host.style.setProperty("--soft-magnet-x", `${x.toFixed(2)}px`);
      host.style.setProperty("--soft-magnet-y", `${y.toFixed(2)}px`);
      frameRef.current = null;
    });
  };

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <span
      ref={hostRef}
      className={`soft-magnet ${className}`.trim()}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
    >
      {children}
    </span>
  );
}
