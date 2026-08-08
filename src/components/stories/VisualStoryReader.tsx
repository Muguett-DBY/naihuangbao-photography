import { ArrowLeft, ArrowRight, BookOpenText, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ImageWithFallback } from "../ImageWithFallback";
import { PrefetchLink } from "../shared/PrefetchLink";
import type { VisualStory } from "../../types/visual-story";

export function VisualStoryReader({ story }: { story: VisualStory }) {
  const rootRef = useRef<HTMLElement>(null);
  const [activeChapter, setActiveChapter] = useState(story.chapters[0]?.id ?? "");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const chapters = Array.from(root.querySelectorAll<HTMLElement>("[data-story-chapter]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = root.getBoundingClientRect();
      const distance = Math.max(1, rect.height - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / distance));
      root.style.setProperty("--story-progress", progress.toFixed(4));

      const readingLine = window.innerHeight * 0.42;
      const current = chapters.find((chapter) => {
        const bounds = chapter.getBoundingClientRect();
        return bounds.top <= readingLine && bounds.bottom > readingLine;
      }) ?? chapters.reduce<HTMLElement | undefined>((closest, chapter) => {
        if (!closest) return chapter;
        return Math.abs(chapter.getBoundingClientRect().top - readingLine)
          < Math.abs(closest.getBoundingClientRect().top - readingLine)
          ? chapter
          : closest;
      }, undefined);
      const id = current?.dataset.storyChapter;
      if (id) setActiveChapter((previous) => previous === id ? previous : id);
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [story.id]);

  const cover = story.chapters[0].media[0];

  return (
    <article ref={rootRef} className="visual-story-reader" style={{ "--story-accent": story.accent } as React.CSSProperties}>
      <div className="visual-story-progress" aria-hidden="true"><span /></div>
      <header className="visual-story-hero">
        <ImageWithFallback src={cover.src} alt={cover.alt} title={story.title} priority sizes="100vw" tone="sage" />
        <div className="visual-story-hero__shade" aria-hidden="true" />
        <div className="visual-story-hero__copy">
          <PrefetchLink to="/stories" className="visual-story-back"><ArrowLeft size={17} aria-hidden="true" /> STORIES</PrefetchLink>
          <span className="platform-index"><Sparkles size={14} aria-hidden="true" /> BRAND CONCEPT IMAGE / {story.readingMinutes} MIN</span>
          <h1>{story.title}</h1>
          <strong>{story.subtitle}</strong>
          <p>{story.summary}</p>
        </div>
        <a className="visual-story-enter" href={`#${story.chapters[0].id}`}><BookOpenText size={18} aria-hidden="true" />进入故事</a>
      </header>

      <nav className="visual-story-index" aria-label="Story chapters">
        <span>{String(story.chapters.findIndex((chapter) => chapter.id === activeChapter) + 1).padStart(2, "0")} / {String(story.chapters.length).padStart(2, "0")}</span>
        <div>
          {story.chapters.map((chapter, index) => (
            <a
              key={chapter.id}
              href={`#${chapter.id}`}
              className={chapter.id === activeChapter ? "is-active" : ""}
              aria-current={chapter.id === activeChapter ? "step" : undefined}
              onClick={() => setActiveChapter(chapter.id)}
            >
              <i aria-hidden="true" />
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{chapter.title}</strong>
            </a>
          ))}
        </div>
      </nav>

      <div className="visual-story-chapters">
        {story.chapters.map((chapter, chapterIndex) => (
          <article id={chapter.id} key={chapter.id} data-story-chapter={chapter.id} className={`visual-story-chapter visual-story-chapter--${chapter.layout}`}>
            <header>
              <span className="platform-index">{chapter.kicker}</span>
              <h2>{chapter.title}</h2>
              <p>{chapter.body}</p>
            </header>
            <div className="visual-story-chapter__media">
              {chapter.media.map((media, mediaIndex) => (
                <figure key={`${media.src}-${mediaIndex}`}>
                  <ImageWithFallback
                    src={media.src}
                    alt={media.alt}
                    title={chapter.title}
                    priority={chapterIndex === 0 && mediaIndex === 0}
                    sizes={chapter.layout === "columns" ? "(max-width: 800px) 100vw, 50vw" : "(max-width: 800px) 100vw, 78vw"}
                    tone={mediaIndex % 2 ? "cream" : "sage"}
                  />
                  <figcaption>{String(mediaIndex + 1).padStart(2, "0")} / {media.alt}</figcaption>
                </figure>
              ))}
            </div>
          </article>
        ))}
      </div>

      <footer className="visual-story-ending">
        <span className="platform-index">END / REMIX THE MATERIAL</span>
        <h2>把这段故事改写成自己的顺序</h2>
        <p>故事创建器会读取同一套视觉档案，项目只保存在当前浏览器。</p>
        <PrefetchLink to="/create/story">打开 Story Builder <ArrowRight size={18} aria-hidden="true" /></PrefetchLink>
      </footer>
    </article>
  );
}
