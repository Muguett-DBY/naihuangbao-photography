import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

let _globalInitialized = false;

export function useGsapGlobalEffects(rootRef?: RefObject<HTMLElement | null>) {
  const guardRef = useRef(false);

  useEffect(() => {
    if (_globalInitialized) return;
    if (guardRef.current) return;
    guardRef.current = true;
    _globalInitialized = true;

    // Lenis smooth scroll
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

    (window as any).lenis = lenis;
    lenis.on("scroll", () => ScrollTrigger.update());
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // Custom cursor global styles
    document.body.classList.add("is-loaded");

    return () => {
      _globalInitialized = false;
      guardRef.current = false;
    };
  }, [guardRef]);
}
