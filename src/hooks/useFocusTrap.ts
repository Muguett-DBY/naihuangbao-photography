import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
].join(",");

type FocusTrapOptions = {
  active?: boolean;
  initialFocus?: "first" | "container" | (() => HTMLElement | null);
  returnFocus?: boolean;
};

function getFocusable(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );
  return nodes.filter((node) => {
    if (node.hasAttribute("disabled")) return false;
    if (node.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle(node);
    if (style.visibility === "hidden" || style.display === "none") return false;
    return true;
  });
}

export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  options: FocusTrapOptions = {}
): MutableRefObject<T | null> {
  const { active = true, initialFocus = "first", returnFocus = true } = options;
  const ref = useRef<T>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return undefined;
    const container = ref.current;
    if (!container) return undefined;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusFirstEligible = () => {
      if (typeof initialFocus === "function") {
        const target = initialFocus();
        if (target) {
          target.focus();
          return;
        }
      }
      if (initialFocus === "container") {
        container.focus();
        return;
      }
      const focusables = getFocusable(container);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        container.tabIndex = -1;
        container.focus();
      }
    };

    const focusTimer = window.setTimeout(focusFirstEligible, 30);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusables = getFocusable(container);
      if (focusables.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;
      if (event.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      if (returnFocus && previouslyFocusedRef.current) {
        const target = previouslyFocusedRef.current;
        if (target && typeof target.focus === "function" && document.contains(target)) {
          window.setTimeout(() => {
            target.focus();
          }, 0);
        }
      }
    };
  }, [active, initialFocus, returnFocus]);

  return ref;
}
