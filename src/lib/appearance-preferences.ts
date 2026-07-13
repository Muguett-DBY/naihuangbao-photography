import { safeLocalStorage } from "./browser-storage";

export type MoodPreference = "magazine" | "cute";
export type ThemePreference = "light" | "dark" | "system";

export function readMoodPreference(): MoodPreference {
  const stored = safeLocalStorage.getItem("mood");
  return stored === "cute" || stored === "magazine" ? stored : "magazine";
}

export function readThemePreference(): ThemePreference {
  const stored = safeLocalStorage.getItem("theme");
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function initializeAppearancePreferences() {
  const root = document.documentElement;
  const storedMood = safeLocalStorage.getItem("mood");
  const storedTheme = safeLocalStorage.getItem("theme");

  if (storedMood !== null && storedMood !== "cute" && storedMood !== "magazine") {
    safeLocalStorage.removeItem("mood");
  }
  if (storedTheme !== null && storedTheme !== "light" && storedTheme !== "dark") {
    safeLocalStorage.removeItem("theme");
  }

  root.setAttribute("data-mood", readMoodPreference());

  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const applyTheme = (isDark: boolean) => {
    const preference = readThemePreference();
    root.setAttribute("data-theme", preference === "system" ? (isDark ? "dark" : "light") : preference);
  };

  applyTheme(systemTheme.matches);
  systemTheme.addEventListener("change", (event) => applyTheme(event.matches));
}
