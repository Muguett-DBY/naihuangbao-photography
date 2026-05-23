import { useEffect, useRef } from "react";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    // Safety: restore native cursor on cleanup no matter what
    let cursorHidden = false;

    const showNative = () => {
      if (cursorHidden) {
        document.body.style.cursor = "";
        cursorHidden = false;
      }
    };

    const hideNative = () => {
      if (!cursorHidden) {
        document.body.style.cursor = "none";
        cursorHidden = true;
      }
    };

    // Center the cursor on mount so it's never offscreen
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    cursor.style.opacity = "1";
    hideNative();

    const move = (e: MouseEvent) => {
      if (!cursorHidden) hideNative();
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };

    const addHover = () => cursor.classList.add("is-hover");
    const rmHover = () => cursor.classList.remove("is-hover");

    const hoverSel =
      "a, button, .package-card, .why-card, .service-detail-card, " +
      ".gallery-masonry-item, .hero-cover-primary-btn, .hero-cover-secondary-btn, " +
      ".nav-cta, .booking-cta";

    document.addEventListener("mousemove", move, { passive: true });

    // Query hover elements dynamically (handle lazy-loaded content)
    const attachHover = () => {
      document.querySelectorAll(hoverSel).forEach((el) => {
        el.addEventListener("mouseenter", addHover);
        el.addEventListener("mouseleave", rmHover);
      });
    };
    attachHover();

    // Re-attach when DOM changes (for lazy-loaded content)
    const observer = new MutationObserver(attachHover);
    observer.observe(document.body, { childList: true, subtree: true });

    // Fallback: if mouse hasn't been seen in 5s, restore native cursor
    let lastMove = Date.now();
    const pingInterval = setInterval(() => {
      if (Date.now() - lastMove > 5000) {
        showNative();
        cursor.style.opacity = "0";
      }
    }, 1000);

    // Override ping on each move
    const pingMove = () => { lastMove = Date.now(); };
    document.addEventListener("mousemove", pingMove, { passive: true });

    return () => {
      showNative();
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mousemove", pingMove);
      observer.disconnect();
      clearInterval(pingInterval);
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
