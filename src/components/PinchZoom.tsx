import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type PinchZoomProps = {
  children: ReactNode;
  maxScale?: number;
  minScale?: number;
  className?: string;
};

const ZOOM_STEP = 0.25;
const DOUBLE_TAP_MAX_DELAY = 320;
const DOUBLE_TAP_DISTANCE = 30;

/**
 * Wraps children in a pinch-to-zoom + double-tap-to-zoom container for touch
 * devices and trackpad/mouse-wheel users on desktop. Uses CSS transforms so
 * image decoding is unaffected.
 */
export function PinchZoom({ children, maxScale = 3, minScale = 1, className }: PinchZoomProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDistanceRef = useRef<number | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const panOriginRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [isGesturing, setIsGesturing] = useState(false);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    function onPointerDown(e: PointerEvent) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointersRef.current.size === 2) {
        const [a, b] = Array.from(pointersRef.current.values());
        if (a && b) lastPinchDistanceRef.current = Math.hypot(a.x - b.x, a.y - b.y);
        panOriginRef.current = null;
        setIsGesturing(true);
      } else if (pointersRef.current.size === 1) {
        panOriginRef.current = { x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y };
        const now = Date.now();
        const last = lastTapRef.current;
        if (
          last &&
          now - last.time < DOUBLE_TAP_MAX_DELAY &&
          Math.hypot(e.clientX - last.x, e.clientY - last.y) < DOUBLE_TAP_DISTANCE
        ) {
          if (scale > 1) reset();
          else setScale(2);
          lastTapRef.current = null;
        } else {
          lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
        }
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointersRef.current.size === 2) {
        const [a, b] = Array.from(pointersRef.current.values());
        if (!a || !b) return;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinchDistanceRef.current === null) {
          lastPinchDistanceRef.current = distance;
          return;
        }
        const ratio = distance / lastPinchDistanceRef.current;
        lastPinchDistanceRef.current = distance;
        setScale((prev) => clamp(prev * ratio, minScale, maxScale));
      } else if (pointersRef.current.size === 1 && scale > 1 && panOriginRef.current) {
        const dx = e.clientX - panOriginRef.current.x;
        const dy = e.clientY - panOriginRef.current.y;
        setOffset({
          x: panOriginRef.current.offsetX + dx,
          y: panOriginRef.current.offsetY + dy,
        });
      }
    }

    function onPointerUp(e: PointerEvent) {
      pointersRef.current.delete(e.pointerId);
      if (pointersRef.current.size < 2) lastPinchDistanceRef.current = null;
      if (pointersRef.current.size === 0) {
        panOriginRef.current = null;
        setIsGesturing(false);
      }
    }

    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.005;
        setScale((prev) => clamp(prev + delta, minScale, maxScale));
      }
    }

    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", onPointerUp);
    node.addEventListener("pointercancel", onPointerUp);
    node.addEventListener("pointerleave", onPointerUp);
    node.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", onPointerUp);
      node.removeEventListener("pointercancel", onPointerUp);
      node.removeEventListener("pointerleave", onPointerUp);
      node.removeEventListener("wheel", onWheel);
    };
  }, [offset.x, offset.y, scale, minScale, maxScale, reset]);

  // Reset offset when scale returns to 1
  useEffect(() => {
    if (scale <= 1) setOffset({ x: 0, y: 0 });
  }, [scale]);

  return (
    <div
      ref={containerRef}
      className={`pinch-zoom ${className ?? ""}`.trim()}
      style={{
        touchAction: scale > 1 ? "none" : "pan-y",
        cursor: scale > 1 ? "grab" : "auto",
        overflow: "hidden",
        position: "relative",
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        if (scale > 1) reset();
        else setScale(2);
      }}
      role="presentation"
    >
      <div
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: isGesturing ? "none" : "transform 0.2s ease-out",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
