import { useEffect, useRef, useState } from "react";

type Theme = "light" | "dark" | "system";

const DARK = {
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

const LIGHT = {
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
  handler(mq.matches);
  mq.addEventListener("change", (e) => handler(e.matches));
  return () => mq.removeEventListener("change", (e) => handler(e.matches));
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "system";
  });
  const systemCleanup = useRef<(() => void) | null>(null);

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
      systemCleanup.current = watchSystem((isDark) => {
        applyVars(root, isDark ? DARK : LIGHT);
      });
    } else {
      localStorage.setItem("theme", theme);
      applyVars(root, theme === "dark" ? DARK : LIGHT);
    }

    return () => {
      if (systemCleanup.current) systemCleanup.current();
    };
  }, [theme]);

  const cycle = () => {
    setTheme((t) => (t === "light" ? "dark" : t === "dark" ? "system" : "light"));
  };

  const label =
    theme === "light" ? "🌞 浅色" : theme === "dark" ? "🌙 深色" : "🖥️ 跟随系统";

  return (
    <button
      className="theme-toggle"
      onClick={cycle}
      title={label}
      aria-label={`当前：${label}，点击切换`}
    >
      {theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "💻"}
    </button>
  );
}
