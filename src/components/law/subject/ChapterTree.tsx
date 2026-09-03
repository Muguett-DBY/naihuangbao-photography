import { useMemo, type CSSProperties } from "react";
import { motion } from "framer-motion";
import type { LawChapter } from "../../../types/law";
import type { LawProgressMap } from "../../../lib/law-progress";
import { PrefetchLink } from "../../shared/PrefetchLink";
import {
  buildQuickPacks,
  lessonKindEmoji,
  lessonKindLabel,
  lessonMeta,
  semanticChapterTitle,
} from "./subjectUtils";

function levelBadge(level: string): string {
  switch (level) {
    case "part":
      return "编";
    case "chapter":
      return "章";
    case "section":
      return "节";
    default:
      return "组";
  }
}

export function ChapterTree({
  chapter,
  graphicIds,
  accent,
  open,
  onToggle,
  progress,
  defaultOpen,
}: {
  chapter: LawChapter;
  graphicIds: Set<string>;
  accent: string;
  open: boolean;
  onToggle: () => void;
  progress: LawProgressMap;
  defaultOpen?: boolean;
}) {
  const doneCount = chapter.lessons.filter((lesson) => progress[lesson.id]?.completedAt).length;
  const packs = useMemo(() => buildQuickPacks(chapter), [chapter]);
  const realTitle = semanticChapterTitle(chapter);

  return (
    <section
      className="law-chapter"
      style={{ "--law-accent": accent, "--law-accent-soft": "var(--law-accent-soft)" } as CSSProperties}
    >
      <button
        type="button"
        className={`law-chapter__head ${open ? "is-open" : ""}`}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="law-chapter__badge">{levelBadge(chapter.level)}</span>
        <strong>{realTitle}</strong>
        <span className="law-chapter__meta">
          {doneCount > 0 ? `✓ ${doneCount}/${chapter.lessons.length} 已掌握` : `${chapter.lessons.length} 课`}
        </span>
        <span className="law-chapter__arrow" aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <motion.ul
          className="law-chapter__lessons"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.22 }}
        >
          {packs.map((pack, packIndex) => (
            <li key={`pack-${packIndex}`}>
              <div className="law-pack">
                <span className="law-pack__label">⚡ 速览包 · {pack.length} 个速览点</span>
                <div className="law-pack__items">
                  {pack.map((lesson) => {
                    const meta = lessonMeta(lesson);
                    return (
                      <PrefetchLink
                        key={lesson.id}
                        to={`/law/learn/${lesson.id}`}
                        className="law-pack__item"
                      >
                        {lesson.title.replace(/^(简述|简答|论述|分析)/, "")}
                        <small>⏱ {meta.steps}步 · ≈{meta.minutes}分</small>
                      </PrefetchLink>
                    );
                  })}
                </div>
              </div>
            </li>
          ))}
          {chapter.lessons.map((lesson, index) => {
            const meta = lessonMeta(lesson);
            const prog = progress[lesson.id];
            if (lesson.steps.length <= 1) return null;
            return (
              <li key={lesson.id}>
                <PrefetchLink
                  to={`/law/learn/${lesson.id}`}
                  className={`law-lesson-link ${prog?.completedAt ? "is-done" : ""} ${graphicIds.has(lesson.id) ? "is-featured" : ""}`}
                >
                  <span className="law-lesson-link__no">{String(index + 1).padStart(2, "0")}</span>
                  <span className="law-lesson-link__title">
                    {graphicIds.has(lesson.id) ? "📐 " : ""}
                    {lesson.title}
                  </span>
                  <span className="law-lesson-link__meta">
                    {lessonKindEmoji(lesson)} {lessonKindLabel(lesson)} · ⏱ {meta.steps}步≈{meta.minutes}分
                  </span>
                  <span className="law-lesson-link__state">
                    {prog?.completedAt ? "⭐ 已掌握" : prog ? "👀 看过" : "开始"}
                  </span>
                </PrefetchLink>
              </li>
            );
          })}
        </motion.ul>
      ) : null}
    </section>
  );
}
