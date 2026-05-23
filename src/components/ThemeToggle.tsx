import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", theme);
      root.classList.add(theme);
    }
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
