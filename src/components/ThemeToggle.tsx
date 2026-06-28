import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type Theme = "light" | "dark" | "system";

/* ══════════════════════════════════════════════
   Magazine (default) palettes
   ══════════════════════════════════════════════ */
const MAGAZINE_DARK = {
  "--custard-bg": "#2D201A",
  "--custard-cream": "#3A2A22",
  "--custard-soft": "#4A352C",
  "--paper-white": "#33241E",
  "--caramel-text": "#D4B8A8",
  "--caramel-deep": "#E8D4C8",
  "--caramel-muted": "#BFA392",
  "--caramel-ink": "#F0E4DC",
  "--warm-border": "rgba(255, 210, 184, 0.12)",
  "--peach-accent": "#E89A80",
  "--peach-soft": "#C47A60",
  "--sage-mist": "#4A5A4A",
  "--sage-text": "#A8BEA0",
} as const;

const MAGAZINE_LIGHT = {
  "--custard-bg": "#FEF3DD",
  "--custard-cream": "#FFF9EC",
  "--custard-soft": "#FFE8C5",
  "--paper-white": "#FFFDF7",
  "--caramel-text": "#8B5E4A",
  "--caramel-deep": "#5F3C31",
  "--caramel-muted": "#9C7664",
  "--caramel-ink": "#442B24",
  "--warm-border": "rgba(139, 94, 74, 0.14)",
  "--peach-accent": "#FFB8A1",
  "--peach-soft": "#FFD2B8",
  "--sage-mist": "#DDE7D7",
  "--sage-text": "#65785F",
} as const;

/* ══════════════════════════════════════════════
   Cute / Animal Island palettes
   ══════════════════════════════════════════════ */
const CUTE_DARK = {
  "--custard-bg": "#2d2820",
  "--custard-cream": "#3a342a",
  "--custard-soft": "#4a4030",
  "--paper-white": "#332c22",
  "--caramel-text": "#D4C4B0",
  "--caramel-deep": "#E0D4C0",
  "--caramel-muted": "#A89A84",
  "--caramel-ink": "#F0E8D8",
  "--warm-border": "rgba(200, 184, 160, 0.12)",
  "--peach-accent": "#3dd4c6",
  "--peach-soft": "#5CE0D4",
  "--sage-mist": "#5a7a6a",
  "--sage-text": "#8ab8a0",
} as const;

const CUTE_LIGHT = {
  "--custard-bg": "#f8f8f0",
  "--custard-cream": "#fdfdf5",
  "--custard-soft": "#f0e8d8",
  "--paper-white": "#fffdf7",
  "--caramel-text": "#794f27",
  "--caramel-deep": "#5a3a1a",
  "--caramel-muted": "#9f927d",
  "--caramel-ink": "#4a3018",
  "--warm-border": "rgba(121, 79, 39, 0.14)",
  "--peach-accent": "#19c8b9",
  "--peach-soft": "#3dd4c6",
  "--sage-mist": "#82d5bb",
  "--sage-text": "#5c8a7a",
} as const;

function getMood() {
  return document.documentElement.getAttribute("data-mood") as "cute" | "magazine" | null;
}

function pickPalette(isDark: boolean) {
  const mood = getMood();
  if (mood === "cute") return isDark ? CUTE_DARK : CUTE_LIGHT;
  return isDark ? MAGAZINE_DARK : MAGAZINE_LIGHT;
}

function applyVars(root: HTMLElement, vars: Record<string, string>) {
  for (const [key, val] of Object.entries(vars)) {
    root.style.setProperty(key, val);
  }
  root.style.setProperty("background", "var(--custard-bg)");
  root.style.setProperty("color", "var(--caramel-text)");
}

function clearVars(root: HTMLElement) {
  root.removeAttribute("style");
}

function watchSystem(handler: (isDark: boolean) => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = (event: MediaQueryListEvent) => handler(event.matches);
  handler(mq.matches);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "system";
  });
  const systemCleanup = useRef<(() => void) | null>(null);

  // Re-apply when mood changes
  const reapply = useCallback(() => {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    if (!storedTheme || storedTheme === "system") {
      clearVars(root);
      // Re-fire system handler
      if (systemCleanup.current) {
        systemCleanup.current();
        systemCleanup.current = null;
      }
      systemCleanup.current = watchSystem((isDark) => {
        applyVars(root, pickPalette(isDark));
      });
    } else {
      applyVars(root, storedTheme === "dark" ? pickPalette(true) : pickPalette(false));
    }
  }, []);

  useEffect(() => {
    window.addEventListener("moodchange", reapply);
    return () => window.removeEventListener("moodchange", reapply);
  }, [reapply]);

  useEffect(() => {
    const root = document.documentElement;

    // Clean up previous system listener
    if (systemCleanup.current) {
      systemCleanup.current();
      systemCleanup.current = null;
    }

    if (theme === "system") {
      localStorage.removeItem("theme");
      clearVars(root);
      root.removeAttribute("data-theme");
      systemCleanup.current = watchSystem((isDark) => {
        applyVars(root, pickPalette(isDark));
        root.setAttribute("data-theme", isDark ? "dark" : "light");
      });
    } else {
      localStorage.setItem("theme", theme);
      applyVars(root, theme === "dark" ? pickPalette(true) : pickPalette(false));
      root.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
    }

    return () => {
      if (systemCleanup.current) systemCleanup.current();
    };
  }, [theme]);

  const cycle = () => {
    setTheme((t) => (t === "light" ? "dark" : t === "dark" ? "system" : "light"));
  };

  const themeLabel =
    theme === "light" ? t("themeToggle.light") : theme === "dark" ? t("themeToggle.dark") : t("themeToggle.system");

  return (
    <button
      className="theme-toggle"
      onClick={cycle}
      title={themeLabel}
      aria-label={t("themeToggle.label", { theme: themeLabel })}
    >
      {theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "💻"}
    </button>
  );
}
