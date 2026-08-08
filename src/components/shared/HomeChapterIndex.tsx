import { useEffect, useRef, useState, type CSSProperties } from "react";

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
  const navRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState(() => {
    const hashId = typeof window === "undefined" ? "" : window.location.hash.slice(1);
    return chapters.some((chapter) => chapter.id === hashId) ? hashId : (chapters[0]?.id ?? "");
  });
  const [desktopIndexEnabled, setDesktopIndexEnabled] = useState(getDesktopIndexEnabled);
  const chapterKey = chapters.map((chapter) => chapter.id).join("|");
  const activeIndex = Math.max(0, chapters.findIndex((chapter) => chapter.id === activeId));
  const style = {
    "--home-index-progress": `${((activeIndex + 1) / Math.max(chapters.length, 1)) * 100}%`,
    "--home-index-chapter-count": chapters.length,
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

  useEffect(() => {
    const syncHash = () => {
      const hashId = window.location.hash.slice(1);
      if (chapters.some((chapter) => chapter.id === hashId)) setActiveId(hashId);
    };

    window.addEventListener("hashchange", syncHash);
    syncHash();
    return () => window.removeEventListener("hashchange", syncHash);
  }, [chapters]);

  useEffect(() => {
    if (desktopIndexEnabled) return;
    const nav = navRef.current;
    const activeLink = nav?.querySelector<HTMLAnchorElement>(`a[href="#${activeId}"]`);
    if (!nav || !activeLink) return;
    const left = activeLink.offsetLeft - (nav.clientWidth - activeLink.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [activeId, desktopIndexEnabled]);

  return (
    <nav
      ref={navRef}
      className="home-index-strip"
      aria-label={ariaLabel}
      data-active-chapter={desktopIndexEnabled ? activeId : undefined}
      style={style}
    >
      {chapters.map((chapter) => {
        const isActive = chapter.id === activeId;
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
