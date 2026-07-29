import { useEffect, useState, type CSSProperties } from "react";

const DESKTOP_INDEX_QUERY = "(min-width: 981px)";

function getDesktopIndexEnabled() {
  return typeof window !== "undefined" && window.matchMedia(DESKTOP_INDEX_QUERY).matches;
}

export interface HomeChapter {
  id: string;
  index: string;
  label: string;
}

interface HomeChapterIndexProps {
  ariaLabel: string;
  chapters: HomeChapter[];
}

export function HomeChapterIndex({ ariaLabel, chapters }: HomeChapterIndexProps) {
  const [activeId, setActiveId] = useState(chapters[0]?.id ?? "");
  const [desktopIndexEnabled, setDesktopIndexEnabled] = useState(getDesktopIndexEnabled);
  const chapterKey = chapters.map((chapter) => chapter.id).join("|");
  const activeIndex = Math.max(0, chapters.findIndex((chapter) => chapter.id === activeId));
  const style = {
    "--home-index-progress": `${((activeIndex + 1) / Math.max(chapters.length, 1)) * 100}%`,
  } as CSSProperties;

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_INDEX_QUERY);
    let observer: IntersectionObserver | undefined;

    const connectObserver = () => {
      observer?.disconnect();
      observer = undefined;
      setDesktopIndexEnabled(mediaQuery.matches);

      if (!mediaQuery.matches) return;

      const visibleChapters = new Map<string, IntersectionObserverEntry>();
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const id = (entry.target as HTMLElement).id;
            if (entry.isIntersecting) {
              visibleChapters.set(id, entry);
            } else {
              visibleChapters.delete(id);
            }
          });

          const nextChapter = [...visibleChapters.entries()].sort(
            ([, first], [, second]) => Math.abs(first.boundingClientRect.top) - Math.abs(second.boundingClientRect.top),
          )[0];
          if (nextChapter) setActiveId(nextChapter[0]);
        },
        {
          rootMargin: "-18% 0px -62% 0px",
          threshold: [0, 0.1, 0.4],
        },
      );

      chapterKey.split("|").forEach((chapterId) => {
        const section = document.getElementById(chapterId);
        if (section) observer?.observe(section);
      });
    };

    connectObserver();
    mediaQuery.addEventListener("change", connectObserver);

    return () => {
      mediaQuery.removeEventListener("change", connectObserver);
      observer?.disconnect();
    };
  }, [chapterKey]);

  return (
    <nav
      className="home-index-strip"
      aria-label={ariaLabel}
      data-active-chapter={desktopIndexEnabled ? activeId : undefined}
      style={style}
    >
      {chapters.map((chapter) => {
        const isActive = desktopIndexEnabled && chapter.id === activeId;
        return (
          <a
            key={chapter.id}
            href={`#${chapter.id}`}
            className={isActive ? "is-active" : undefined}
            aria-current={isActive ? "location" : undefined}
            onClick={() => setActiveId(chapter.id)}
          >
            <span>{chapter.index}</span>
            <strong>{chapter.label}</strong>
          </a>
        );
      })}
    </nav>
  );
}
