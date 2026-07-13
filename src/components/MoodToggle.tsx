import { NotebookPen, Newspaper } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { readMoodPreference, type MoodPreference } from "../lib/appearance-preferences";
import { safeLocalStorage } from "../lib/browser-storage";

export function MoodToggle() {
  const { t } = useTranslation();
  const [mood, setMood] = useState<MoodPreference>(readMoodPreference);
  const initialised = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-mood", mood);
    window.dispatchEvent(new CustomEvent("moodchange", { detail: mood }));

    if (!initialised.current) {
      requestAnimationFrame(() => {
        document.documentElement.classList.add("style-transition");
      });
      initialised.current = true;
    }
  }, [mood]);

  const toggle = () => {
    const next: MoodPreference = mood === "magazine" ? "cute" : "magazine";
    setMood(next);
    safeLocalStorage.setItem("mood", next);
  };

  const label = mood === "magazine" ? t("moodToggle.labelMagazine") : t("moodToggle.labelCute");
  const MoodIcon = mood === "magazine" ? Newspaper : NotebookPen;

  return (
    <button
      className="mood-toggle"
      type="button"
      onClick={toggle}
      title={mood === "magazine" ? t("moodToggle.magazine") : t("moodToggle.cute")}
      aria-label={label}
    >
      <MoodIcon size={17} aria-hidden="true" />
    </button>
  );
}
