import { useEffect } from "react";
import { useGlobalVisualEffects } from "../hooks/useGlobalVisualEffects";
import { CustomCursor } from "./CustomCursor";
import { FilmGrain } from "./FilmGrain";
import { ScrollProgress } from "./ScrollProgress";

/**
 * Visual effects and global GSAP setup that are NOT critical for first paint.
 *
 * This module is loaded via React.lazy() from RootLayout so cursor and texture
 * decoration stay outside the critical render path. Motion itself relies on
 * native browser primitives and does not hijack scrolling.
 */
export default function GlobalEffects() {
  useGlobalVisualEffects();

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
