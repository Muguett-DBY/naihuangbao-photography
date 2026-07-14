import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

let globalInitialized = false;

declare global {
  interface Window {
    __nhbLenis?: Pick<Lenis, "start" | "stop">;
  }
}

export function useGsapGlobalEffects() {
  useEffect(() => {
    if (globalInitialized) return;
    globalInitialized = true;
    document.body.classList.add("is-loaded");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

    if (reduceMotion || coarsePointer) {
      return () => {
        globalInitialized = false;
      };
    }

    const lenis = new Lenis({
      duration: 1,
      easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      orientation: "vertical",
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
      infinite: false,
    });
    const syncScroll = () => ScrollTrigger.update();
    const tickerFrame = (time: number) => lenis.raf(time * 1000);

    window.__nhbLenis = lenis;
    lenis.on("scroll", syncScroll);
    gsap.ticker.add(tickerFrame);
    gsap.ticker.lagSmoothing(500, 33);

    return () => {
      gsap.ticker.remove(tickerFrame);
      lenis.off("scroll", syncScroll);
      lenis.destroy();
      if (window.__nhbLenis === lenis) delete window.__nhbLenis;
      globalInitialized = false;
    };
  }, []);
}
