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

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root was not found");
}

// ── Lenis smooth scroll ──
const lenis = new Lenis({
  duration: 1.1,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: "vertical",
  smoothWheel: true,
  syncTouch: true,
});

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
