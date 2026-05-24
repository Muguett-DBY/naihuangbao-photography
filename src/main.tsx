import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { App } from "./App";
import "./styles/global.css";

for (const href of ["https://www.xiaohongshu.com"]) {
  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = href;
  preconnect.crossOrigin = "anonymous";
  document.head.append(preconnect);
}

// Idle-time prefetch of key gallery images
if ("requestIdleCallback" in window) {
  requestIdleCallback(
    () => {
      const imgs = ["/images/gallery/640/gallery-urban-01.webp", "/images/gallery/640/gallery-garden-01.webp", "/images/gallery/640/gallery-jiangnan-01.webp"];
      imgs.forEach((src) => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "image";
        link.href = src;
        document.head.append(link);
      });
    },
    { timeout: 3000 },
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root was not found");
}

// ── Lenis smooth scroll ──
const lenis = new Lenis({
  duration: 1.2,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: "vertical",
  smoothWheel: true,
  syncTouch: true,
  touchMultiplier: 1.5,
  wheelMultiplier: 1.0,
  infinite: false,
});

// Expose Lenis globally for other components (SectionNav, etc.)
(window as any).lenis = lenis;

// Sync Lenis with GSAP ScrollTrigger
lenis.on("scroll", () => ScrollTrigger.update());

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

requestAnimationFrame(() => {
  document.body.classList.add("is-loaded");
});


