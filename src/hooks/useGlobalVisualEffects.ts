import { useEffect } from "react";

/**
 * Keeps the global motion boundary intentionally lightweight.
 * Page reveals and scroll feedback use native browser primitives, so the
 * public shell does not need to download a scroll-smoothing runtime.
 */
export function useGlobalVisualEffects() {
  useEffect(() => {
    document.body.classList.add("is-loaded");
  }, []);
}
