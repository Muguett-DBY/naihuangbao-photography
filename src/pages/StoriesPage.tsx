import "../styles/platform-v3.css";
import "../styles/story-v2.css";
import { ArrowRight, BookOpenText, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { visualStories } from "../data/visual-stories";
import { useSEO } from "../hooks/useSEO";

export function StoriesPage() {
  const { t } = useTranslation();
  useSEO({ titleKey: "platform.stories.title", descKey: "platform.stories.description", path: "/stories" });

  return (
    <PageTransition className="platform-page stories-v2-page">
      <header className="stories-v2-header">
        <div>
          <span className="platform-index"><Sparkles size={14} aria-hidden="true" /> NHB / VISUAL STORIES / 2026</span>
          <h1>{t("platform.stories.title")}</h1>
        </div>
        <p>{t("platform.stories.description")}</p>
        <div className="stories-v2-header__rule"><span>ISSUE 02</span><span>{visualStories.length} SCROLL ESSAYS</span></div>
      </header>

      <div className="stories-v2-list">
        {visualStories.map((story, index) => {
          const cover = story.chapters[0].media[0];
          return (
            <article className={`stories-v2-entry ${index === 0 ? "stories-v2-entry--lead" : ""}`} key={story.id} style={{ "--story-accent": story.accent } as React.CSSProperties}>
              <PrefetchLink to={`/stories/${story.id}`} className="stories-v2-entry__media" aria-label={`阅读 ${story.title}`}>
                <ImageWithFallback src={cover.src} alt={cover.alt} title={story.title} priority={index === 0} sizes={index === 0 ? "100vw" : "(max-width: 800px) 100vw, 62vw"} tone="sage" />
                <span className="stories-v2-entry__number">{String(index + 1).padStart(2, "0")}</span>
              </PrefetchLink>
              <div className="stories-v2-entry__copy">
                <span className="platform-index"><BookOpenText size={14} aria-hidden="true" /> {story.readingMinutes} MIN / {story.chapters.length} CHAPTERS / CONCEPT</span>
                <h2>{story.title}</h2>
                <strong>{story.subtitle}</strong>
                <p>{story.summary}</p>
                <PrefetchLink to={`/stories/${story.id}`}>进入滚动故事 <ArrowRight size={18} aria-hidden="true" /></PrefetchLink>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="stories-v2-create">
        <span className="platform-index">MAKE / LOCAL FIRST</span>
        <h2>不只阅读，也可以重新编排</h2>
        <PrefetchLink to="/create/story">打开 Story Builder <ArrowRight size={18} aria-hidden="true" /></PrefetchLink>
      </footer>
    </PageTransition>
  );
}
