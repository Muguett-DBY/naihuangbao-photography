import { useCallback, useEffect, useRef } from "react";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);
  const pos = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  const idleTimer = useRef(0);

  const onMove = useCallback((e: MouseEvent) => {
    pos.current = { x: e.clientX, y: e.clientY };
    idleTimer.current = 0;

    const target = e.target as HTMLElement;
    const isClickable = target.closest("a, button, [role='button'], input, select, textarea, label, .gallery-card, .package-card, .why-card");
    const isImage = target.closest("img, .img-blur-wrap, .gallery-image-placeholder");
    const ring = ringRef.current;
    if (ring) {
      ring.classList.toggle("is-clickable", !!isClickable);
      ring.classList.toggle("is-image", !!isImage);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.addEventListener("mousemove", onMove, { passive: true });

    const loop = () => {
      idleTimer.current++;
      if (!document.hidden && idleTimer.current < 300) {
        ringPos.current.x += (pos.current.x - ringPos.current.x) * 0.12;
        ringPos.current.y += (pos.current.y - ringPos.current.y) * 0.12;

        dot.style.transform = `translate(${pos.current.x - 3}px, ${pos.current.y - 3}px)`;
        ring.style.transform = `translate(${ringPos.current.x - 16}px, ${ringPos.current.y - 16}px)`;
      }
      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId.current);
    };
  }, [onMove]);

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#8B5E4A",
          pointerEvents: "none",
          zIndex: 9998,
          willChange: "transform",
        }}
      />
      <div
        ref={ringRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "1.5px solid rgba(139, 94, 74, 0.4)",
          pointerEvents: "none",
          zIndex: 9997,
          willChange: "transform",
          transition: "width 0.2s, height 0.2s, border-color 0.2s, background 0.2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: "#8B5E4A",
        }}
      />
      <style>{`
        @media (hover: hover) and (pointer: fine) {
          .booking-modal input,
          .booking-modal textarea,
          .booking-modal select,
          .login-page input,
          .login-page textarea,
          .adm-login input,
          .adm-login textarea,
          .public-chat-form textarea,
          .newsletter-form input,
          #booking-name,
          #booking-contact,
          #booking-notes,
          #booking-time,
          input, textarea, select { cursor: text !important; }
        }

        .is-clickable {
          width: 24px !important;
          height: 24px !important;
          border-color: rgba(139, 94, 74, 0.6) !important;
          background: rgba(139, 94, 74, 0.08) !important;
        }
        .is-image {
          width: 48px !important;
          height: 48px !important;
          border-color: rgba(255, 184, 161, 0.5) !important;
          background: rgba(255, 184, 161, 0.1) !important;
        }
        .is-image::after {
          content: "🔍";
          font-size: 14px;
        }
      `}</style>
    </>
  );
}
