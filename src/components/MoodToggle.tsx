import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type Mood = "magazine" | "cute";

export function MoodToggle() {
  const { t } = useTranslation();
  const [mood, setMood] = useState<Mood>(() => {
    return (localStorage.getItem("mood") as Mood) || "magazine";
  });
  const initialised = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-mood", mood);
    // Trigger theme re-apply so ThemeToggle picks the right palette
    window.dispatchEvent(new CustomEvent("moodchange", { detail: mood }));

    // Add transition class after initial render (skip the first time)
    if (!initialised.current) {
      requestAnimationFrame(() => {
        document.documentElement.classList.add("style-transition");
      });
      initialised.current = true;
    }
  }, [mood]);

  const toggle = () => {
    const next: Mood = mood === "magazine" ? "cute" : "magazine";
    setMood(next);
    localStorage.setItem("mood", next);
  };

  return (
    <button
      className="mood-toggle"
      onClick={toggle}
      title={mood === "magazine" ? t("moodToggle.magazine") : t("moodToggle.cute")}
      aria-label={mood === "magazine" ? t("moodToggle.labelMagazine") : t("moodToggle.labelCute")}
    >
      {mood === "magazine" ? "🎨" : "🌿"}
    </button>
  );
}
