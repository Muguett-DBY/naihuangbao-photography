import "../styles/platform-v3.css";
import { useTranslation } from "react-i18next";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { PageTransition } from "../components/shared/PageTransition";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { archiveProjects } from "../data/living-archive";
import { useSEO } from "../hooks/useSEO";

export function StoriesPage() {
  const { t } = useTranslation();
  const stories = archiveProjects.slice(0, 4);
  useSEO({ titleKey: "platform.stories.title", descKey: "platform.stories.description", path: "/stories" });

  return (
    <PageTransition className="platform-page stories-page">
      <header className="platform-editorial-header">
        <span className="platform-index">NHB / FIELD NOTES / 2026</span>
        <h1>{t("platform.stories.title")}</h1>
        <p>{t("platform.stories.description")}</p>
        <div className="platform-header-rule"><span>ISSUE 01</span><span>{stories.length} NOTES</span></div>
      </header>

      <div className="story-essays">
        {stories.map((story, index) => (
          <article className="story-essay" key={story.id}>
            <div className="story-essay__media">
              <ImageWithFallback
                src={story.media[0].src}
                alt={story.media[0].alt}
                title={story.title}
                priority={index === 0}
                sizes="(max-width: 768px) 100vw, 62vw"
                tone={index % 2 === 0 ? "sage" : "cream"}
              />
            </div>
            <div className="story-essay__copy">
              <span>{story.chapter} / {story.place} / {story.season}</span>
              <h2>{story.title}</h2>
              <strong>{story.subtitle}</strong>
              <p>{story.summary}</p>
              <PrefetchLink to={`/archive#${story.id}`}>{t("platform.stories.readStudy")} <span aria-hidden="true">↗</span></PrefetchLink>
            </div>
          </article>
        ))}
      </div>
    </PageTransition>
  );
}
