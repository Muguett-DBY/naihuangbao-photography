import { useEffect, useRef } from "react";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    // Use CSS left/top for positioning — more reliable than margin offset
    cursor.style.top = "0";
    cursor.style.left = "0";

    const move = (e: MouseEvent) => {
      cursor.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 10}px)`;
      if (!document.body.style.cursor) {
        document.body.style.cursor = "none";
      }
    };

    const addHover = () => cursor.classList.add("is-hover");
    const rmHover = () => cursor.classList.remove("is-hover");
    const hoverSel =
      "a, button, .package-card, .why-card, .service-detail-card, " +
      ".gallery-masonry-item, .hero-cover-primary-btn, .hero-cover-secondary-btn, " +
      ".nav-cta, .booking-cta";

    // Position cursor at center immediately
    const cx = window.innerWidth / 2 - 10;
    const cy = window.innerHeight / 2 - 10;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    cursor.style.opacity = "1";

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
