import { Monitor, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { readThemePreference, type ThemePreference } from "../lib/appearance-preferences";
import { safeLocalStorage } from "../lib/browser-storage";

const FIELD_NOTES_LIGHT = {
  "--ink": "#17201b",
  "--newsprint": "#f4f0e7",
  "--paper": "#fffdf8",
  "--moss": "#355c4b",
  "--moss-dark": "#234336",
  "--coral": "#d95f4b",
  "--coral-dark": "#ad3f31",
  "--sky-note": "#b9d7dc",
  "--sun-note": "#e6c867",
  "--text-muted": "#667069",
  "--hairline": "rgba(23, 32, 27, 0.18)",
} as const;

const FIELD_NOTES_DARK = {
  "--ink": "#f4f0e7",
  "--newsprint": "#121915",
  "--paper": "#1b2520",
  "--moss": "#83a995",
  "--moss-dark": "#b8d1c3",
  "--coral": "#ef806e",
  "--coral-dark": "#f29a8b",
  "--sky-note": "#38565a",
  "--sun-note": "#b29a4f",
  "--text-muted": "#b6c0ba",
  "--hairline": "rgba(244, 240, 231, 0.2)",
} as const;

const FIELD_NOTE_ACCENTS_LIGHT = {
  "--sky-note": "#c8dfe2",
  "--sun-note": "#ead276",
} as const;

const FIELD_NOTE_ACCENTS_DARK = {
  "--sky-note": "#456367",
  "--sun-note": "#bea75c",
} as const;

function getMood() {
  return document.documentElement.getAttribute("data-mood") as "cute" | "magazine" | null;
}

function pickPalette(isDark: boolean): Record<string, string> {
  const base = isDark ? FIELD_NOTES_DARK : FIELD_NOTES_LIGHT;
  if (getMood() !== "cute") return base;
  return {
    ...base,
    ...(isDark ? FIELD_NOTE_ACCENTS_DARK : FIELD_NOTE_ACCENTS_LIGHT),
  };
}

function applyVars(root: HTMLElement, vars: Record<string, string>) {
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.style.setProperty("background", "var(--newsprint)");
  root.style.setProperty("color", "var(--ink)");
}

function clearVars(root: HTMLElement) {
  for (const key of Object.keys(FIELD_NOTES_LIGHT)) {
    root.style.removeProperty(key);
  }
  root.style.removeProperty("background");
  root.style.removeProperty("color");
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
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);
  const systemCleanup = useRef<(() => void) | null>(null);

  const reapply = useCallback(() => {
    const root = document.documentElement;
    const storedTheme = readThemePreference();
    if (storedTheme === "system") {
      clearVars(root);
      systemCleanup.current?.();
      systemCleanup.current = watchSystem((isDark) => {
        applyVars(root, pickPalette(isDark));
        root.setAttribute("data-theme", isDark ? "dark" : "light");
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
    systemCleanup.current?.();
    systemCleanup.current = null;

    if (theme === "system") {
      safeLocalStorage.removeItem("theme");
      clearVars(root);
      systemCleanup.current = watchSystem((isDark) => {
        applyVars(root, pickPalette(isDark));
        root.setAttribute("data-theme", isDark ? "dark" : "light");
      });
    } else {
      safeLocalStorage.setItem("theme", theme);
      applyVars(root, theme === "dark" ? pickPalette(true) : pickPalette(false));
      root.setAttribute("data-theme", theme);
    }

    return () => systemCleanup.current?.();
  }, [theme]);

  const cycle = () => {
    setTheme((current) => (current === "light" ? "dark" : current === "dark" ? "system" : "light"));
  };

  const themeLabel =
    theme === "light" ? t("themeToggle.light") : theme === "dark" ? t("themeToggle.dark") : t("themeToggle.system");
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={cycle}
      title={themeLabel}
      aria-label={t("themeToggle.label", { theme: themeLabel })}
    >
      <ThemeIcon size={17} aria-hidden="true" />
    </button>
  );
}
