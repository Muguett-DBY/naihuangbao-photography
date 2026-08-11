import { Pencil } from "lucide-react";
import type { CSSProperties } from "react";
import { ImageWithFallback } from "../ImageWithFallback";
import type { StoryProject } from "../../lib/story-project-store";
import { useWorkspaceCopy } from "../../i18n/workspace-copy";

export function StoryBuilderPreview({ project, activeChapterId, onSelectChapter, device = "desktop" }: {
  project: StoryProject;
  activeChapterId: string;
  onSelectChapter: (id: string) => void;
  device?: "desktop" | "mobile";
}) {
  const { text } = useWorkspaceCopy();
  return (
    <div className={`story-builder-preview story-builder-preview--${device}`} style={{ "--story-accent": project.accent } as CSSProperties}>
      <header>
        <span>NHB / {text("liveStoryPreview")}</span>
        <h2>{project.title || text("untitledStory")}</h2>
        <p>{project.subtitle}</p>
      </header>
      <div>
        {project.chapters.map((chapter, index) => (
          <article
            key={chapter.id}
            className={`story-builder-preview__chapter story-builder-preview__chapter--${chapter.layout} ${chapter.id === activeChapterId ? "is-active" : ""}`}
            data-scene-transition={chapter.scene.transition}
            style={{
              "--story-scene-duration": `${chapter.scene.durationMs}ms`,
              "--story-scene-intensity": chapter.scene.intensity,
              "--story-scene-depth": chapter.scene.depth,
              "--story-scene-focus-x": `${chapter.scene.focusX * 100}%`,
              "--story-scene-focus-y": `${chapter.scene.focusY * 100}%`,
            } as CSSProperties}
          >
            <header>
              <span>{chapter.kicker}</span>
              <button type="button" title={text("editChapter")} aria-label={text("editChapterLabel", { title: chapter.title })} onClick={() => onSelectChapter(chapter.id)}><Pencil size={14} aria-hidden="true" /></button>
              <h3>{chapter.title}</h3><p>{chapter.body}</p>
            </header>
            <div>
              {chapter.media.length > 0 ? chapter.media.map((media, mediaIndex) => (
                <ImageWithFallback key={media.id} src={media.src} alt={media.alt} title={chapter.title} sizes="(max-width: 900px) 100vw, 46vw" priority={index === 0 && mediaIndex === 0} tone="sage" />
              )) : <button type="button" onClick={() => onSelectChapter(chapter.id)}>{text("addFrameFromArchive")}</button>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
