import { useEffect, useRef } from "react";
import { useGsapGlobalEffects } from "../hooks/useGsapGlobalEffects";
import { CustomCursor } from "./CustomCursor";
import { FilmGrain } from "./FilmGrain";
import { ScrollProgress } from "./ScrollProgress";

/**
 * Visual effects and global GSAP setup that are NOT critical for first paint.
 *
 * This module is loaded via React.lazy() from RootLayout so that the initial
 * JavaScript bundle excludes gsap, ScrollTrigger, Lenis, and the visual
 * decoration components. The page renders and becomes interactive first;
 * the cinematic layer (custom cursor, film grain, smooth scroll) kicks in
 * once this chunk arrives.
 */
export default function GlobalEffects() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useGsapGlobalEffects(rootRef);

  useEffect(() => {
    // Trigger the body class without re-entering Lenis (the hook handles that).
    if (!document.body.classList.contains("is-loaded")) {
      document.body.classList.add("is-loaded");
    }
  }, []);

  return (
    <>
      <ScrollProgress />
      <CustomCursor />
      <FilmGrain />
    </>
  );
}
