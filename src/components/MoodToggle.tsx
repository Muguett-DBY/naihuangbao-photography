import { useEffect, useRef, useState } from "react";

type Mood = "magazine" | "cute";

export function MoodToggle() {
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
      title={mood === "magazine" ? "切换可爱风" : "切换杂志风"}
      aria-label={`当前：${mood === "magazine" ? "杂志风" : "可爱风"}，点击切换`}
    >
      {mood === "magazine" ? "🎨" : "🌿"}
    </button>
  );
}
