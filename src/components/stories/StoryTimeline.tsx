import { GripVertical, Plus } from "lucide-react";
import { useState, type DragEvent } from "react";
import type { StoryProjectChapter } from "../../lib/story-project-store";
import { ImageWithFallback } from "../ImageWithFallback";
import { useWorkspaceCopy } from "../../i18n/workspace-copy";

export function StoryTimeline({ chapters, activeChapterId, onSelect, onReorder, onAdd }: {
  chapters: StoryProjectChapter[];
  activeChapterId: string;
  onSelect: (id: string) => void;
  onReorder: (sourceId: string, targetId: string) => void;
  onAdd: () => void;
}) {
  const { text } = useWorkspaceCopy();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const handleDrop = (event: DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault();
    if (draggedId && draggedId !== targetId) onReorder(draggedId, targetId);
    setDraggedId(null);
  };

  return (
    <section className="story-timeline" aria-labelledby="story-timeline-title">
      <header><div><strong id="story-timeline-title">{text("chapterTimeline")}</strong><small>{text("reorderChapters")}</small></div><button type="button" onClick={onAdd}><Plus size={15} aria-hidden="true" />{text("add")}</button></header>
      <div role="list">
        {chapters.map((chapter, index) => (
          <article
            role="listitem"
            key={chapter.id}
            draggable
            className={`${chapter.id === activeChapterId ? "is-active" : ""}${chapter.id === draggedId ? " is-dragging" : ""}`}
            onDragStart={(event) => { setDraggedId(chapter.id); event.dataTransfer.effectAllowed = "move"; }}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
            onDrop={(event) => handleDrop(event, chapter.id)}
          >
            <GripVertical size={15} aria-hidden="true" />
            <button type="button" onClick={() => onSelect(chapter.id)} aria-current={chapter.id === activeChapterId ? "step" : undefined}>
              {chapter.media[0] ? <ImageWithFallback src={chapter.media[0].src} alt="" title={chapter.title} sizes="92px" tone="sage" /> : <span aria-hidden="true" />}
              <span><small>{String(index + 1).padStart(2, "0")} · {chapter.layout.toUpperCase()}</small><strong>{chapter.title}</strong></span>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
