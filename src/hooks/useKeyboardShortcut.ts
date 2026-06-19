import { useEffect } from "react";

type KeyboardShortcutOptions = {
  key: string;
  enabled?: boolean;
  preventDefault?: boolean;
  onMatch: (event: KeyboardEvent) => void;
  ignoreWhenTyping?: boolean;
};

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function useKeyboardShortcut({
  key,
  enabled = true,
  preventDefault = true,
  onMatch,
  ignoreWhenTyping = true,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    if (!enabled) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (ignoreWhenTyping) {
        const target = event.target as HTMLElement | null;
        if (target && (TYPING_TAGS.has(target.tagName) || target.isContentEditable)) {
          return;
        }
      }
      if (event.key === key || event.key.toLowerCase() === key.toLowerCase()) {
        if (preventDefault) event.preventDefault();
        onMatch(event);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, enabled, preventDefault, onMatch, ignoreWhenTyping]);
}
