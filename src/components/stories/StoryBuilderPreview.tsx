import { Pencil } from "lucide-react";
import { ImageWithFallback } from "../ImageWithFallback";
import type { StoryProject } from "../../lib/story-project-store";

export function StoryBuilderPreview({ project, activeChapterId, onSelectChapter }: {
  project: StoryProject;
  activeChapterId: string;
  onSelectChapter: (id: string) => void;
}) {
  return (
    <div className="story-builder-preview" style={{ "--story-accent": project.accent } as React.CSSProperties}>
      <header>
        <span>NHB / LIVE STORY PREVIEW</span>
        <h2>{project.title || "Untitled story"}</h2>
        <p>{project.subtitle}</p>
      </header>
      <div>
        {project.chapters.map((chapter, index) => (
          <article
            key={chapter.id}
            className={`story-builder-preview__chapter story-builder-preview__chapter--${chapter.layout} ${chapter.id === activeChapterId ? "is-active" : ""}`}
          >
            <header>
              <span>{chapter.kicker}</span>
              <button type="button" title="Edit chapter" aria-label={`Edit ${chapter.title}`} onClick={() => onSelectChapter(chapter.id)}><Pencil size={14} aria-hidden="true" /></button>
              <h3>{chapter.title}</h3><p>{chapter.body}</p>
            </header>
            <div>
              {chapter.media.length > 0 ? chapter.media.map((media, mediaIndex) => (
                <ImageWithFallback key={media.id} src={media.src} alt={media.alt} title={chapter.title} sizes="(max-width: 900px) 100vw, 46vw" priority={index === 0 && mediaIndex === 0} tone="sage" />
              )) : <button type="button" onClick={() => onSelectChapter(chapter.id)}>从右侧档案加入画面</button>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
