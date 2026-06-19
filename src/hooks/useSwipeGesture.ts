import { useEffect, useRef } from "react";

type SwipeDirection = "left" | "right" | "up" | "down";

type SwipeHandlers = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
};

type SwipeOptions = {
  threshold?: number;
  restraint?: number;
  allowedTime?: number;
  trackTouch?: boolean;
  trackMouse?: boolean;
};

const DEFAULT_OPTIONS: Required<SwipeOptions> = {
  threshold: 50,
  restraint: 75,
  allowedTime: 600,
  trackTouch: true,
  trackMouse: false,
};

/**
 * Detects swipe gestures (touch and optionally mouse drag) on a ref'd element.
 * - horizontal swipe distance > threshold and vertical movement < restraint
 * - within allowedTime (ms)
 *
 * Usage:
 *   const ref = useSwipeGesture({ onSwipeUp: () => openLightbox() });
 *   <div ref={ref}>...</div>
 */
export function useSwipeGesture(handlers: SwipeHandlers, options: SwipeOptions = {}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const opts = { ...DEFAULT_OPTIONS, ...options };

    function start(event: TouchEvent | MouseEvent) {
      const point = "touches" in event ? event.touches[0] : event;
      if (!point) return;
      startRef.current = { x: point.clientX, y: point.clientY, t: Date.now() };
    }

    function end(event: TouchEvent | MouseEvent, isTouch: boolean) {
      const start = startRef.current;
      startRef.current = null;
      if (!start) return;

      const point = isTouch
        ? (event as TouchEvent).changedTouches[0]
        : (event as MouseEvent);
      if (!point) return;

      const dx = point.clientX - start.x;
      const dy = point.clientY - start.y;
      const dt = Date.now() - start.t;
      if (dt > opts.allowedTime) return;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      let direction: SwipeDirection | null = null;
      if (absX >= opts.threshold && absY <= opts.restraint) {
        direction = dx > 0 ? "right" : "left";
      } else if (absY >= opts.threshold && absX <= opts.restraint) {
        direction = dy > 0 ? "down" : "up";
      }
      if (!direction) return;

      if (direction === "left") handlers.onSwipeLeft?.();
      else if (direction === "right") handlers.onSwipeRight?.();
      else if (direction === "up") handlers.onSwipeUp?.();
      else if (direction === "down") handlers.onSwipeDown?.();
    }

    const onTouchStart = (e: TouchEvent) => { if (opts.trackTouch) start(e); };
    const onTouchEnd = (e: TouchEvent) => { if (opts.trackTouch) end(e, true); };
    const onMouseDown = (e: MouseEvent) => { if (opts.trackMouse) start(e); };
    const onMouseUp = (e: MouseEvent) => { if (opts.trackMouse) end(e, false); };

    if (opts.trackTouch) {
      node.addEventListener("touchstart", onTouchStart, { passive: true });
      node.addEventListener("touchend", onTouchEnd, { passive: true });
    }
    if (opts.trackMouse) {
      node.addEventListener("mousedown", onMouseDown);
      node.addEventListener("mouseup", onMouseUp);
    }

    return () => {
      if (opts.trackTouch) {
        node.removeEventListener("touchstart", onTouchStart);
        node.removeEventListener("touchend", onTouchEnd);
      }
      if (opts.trackMouse) {
        node.removeEventListener("mousedown", onMouseDown);
        node.removeEventListener("mouseup", onMouseUp);
      }
    };
  }, [handlers, options]);

  return ref;
}
