import { useEffect, useRef } from "react";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    // Only show custom cursor on non-touch devices
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    document.body.style.cursor = "none";

    const move = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };

    const addHover = () => cursor.classList.add("is-hover");
    const rmHover = () => cursor.classList.remove("is-hover");

    // Track hoverable interactive elements
    const hoverSel = "a, button, .package-card, .why-card, .service-detail-card, .gallery-masonry-item, .hero-cover-primary-btn, .hero-cover-secondary-btn, .nav-cta, .booking-cta";
    document.addEventListener("mousemove", move, { passive: true });
    document.querySelectorAll(hoverSel).forEach((el) => {
      el.addEventListener("mouseenter", addHover);
      el.addEventListener("mouseleave", rmHover);
    });

    return () => {
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", move);
      document.querySelectorAll(hoverSel).forEach((el) => {
        el.removeEventListener("mouseenter", addHover);
        el.removeEventListener("mouseleave", rmHover);
      });
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="custom-cursor"
      aria-hidden="true"
    />
  );
}
