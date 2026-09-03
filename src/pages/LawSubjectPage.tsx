import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router";
import { motion } from "framer-motion";
import type { LawBook, LawChapter } from "../types/law";
import { LAW_SUBJECT_MAP } from "../data/law/meta";
import { loadLawBook } from "../data/law/loader";
import { getLawProgress } from "../lib/law-progress";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { LawMascot } from "../components/law/LawMascot";
import "../styles/law-academy.css";

function isLawSubjectId(value: string | undefined): value is keyof typeof LAW_SUBJECT_MAP {
  return !!value && value in LAW_SUBJECT_MAP;
}

export function LawSubjectPage() {
  const { subjectId } = useParams();
  const [book, setBook] = useState<LawBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openChapter, setOpenChapter] = useState<string | null>(null);

  const valid = isLawSubjectId(subjectId);
  const subject = valid ? LAW_SUBJECT_MAP[subjectId] : null;

  useEffect(() => {
    if (!valid || !subjectId) return;
    let cancelled = false;
    setBook(null);
    loadLawBook(subjectId)
      .then((loaded) => {
        if (cancelled) return;
        setBook(loaded);
        setOpenChapter(loaded.chapters[0]?.id ?? null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId, valid]);

  const progress = useMemo(() => getLawProgress(), []);

  if (!valid || !subject) {
    return (
      <div className="law-academy">
        <div className="law-notfound">
          <LawMascot mood="oops" size={80} />
          <h1>这门学科不在书单里哦</h1>
          <Link to="/law" className="law-player__cta">← 回学习中心</Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="law-academy">
        <div className="law-notfound">
          <h1>内容加载失败：{error}</h1>
          <Link to="/law" className="law-player__cta">← 回学习中心</Link>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="law-academy">
        <div className="law-loading" aria-live="polite">
          <LawMascot mood="think" size={64} />
          <p>正在把《{subject.fullName}》装进书包……</p>
        </div>
      </div>
    );
  }

  const style = {
    "--law-accent": subject.accent,
    "--law-accent-soft": subject.accentSoft,
  } as CSSProperties;

  return (
    <div className="law-academy law-subject" style={style}>
      <header className="law-subject__hero">
        <Link to="/law" className="law-subject__back">← 学习中心</Link>
        <div className="law-subject__title">
          <span className="law-subject__emoji">{subject.emoji}</span>
          <div>
            <h1>{subject.name}</h1>
            <p>{subject.fullName} · {book.lessonCount} 个知识点</p>
          </div>
        </div>
        <div className="law-subject__hero-note">
          想看哪一节课，点它就行。▸ 星星表示已掌握
        </div>
      </header>

      <div className="law-subject__chapters">
        {book.chapters.map((chapter) => (
          <ChapterTree
            key={chapter.id}
            chapter={chapter}
            subjectId={book.id}
            accent={subject.accent}
            open={openChapter === chapter.id}
            onToggle={() =>
              setOpenChapter((current) => (current === chapter.id ? null : chapter.id))
            }
            progress={progress}
            defaultOpen={chapter.id === book.chapters[0]?.id}
          />
        ))}
      </div>

      {book.leftover.length > 0 ? (
        <section className="law-subject__leftover">
          <h2>📎 附录 · 未归入章节的原文</h2>
          <details>
            <summary>点击展开查看（这些内容也完整保留，未删除）</summary>
            <pre>{book.leftover.join("\n")}</pre>
          </details>
        </section>
      ) : null}
    </div>
  );
}

function ChapterTree({
  chapter,
  subjectId,
  accent,
  open,
  onToggle,
  progress,
  defaultOpen,
}: {
  chapter: LawChapter;
  subjectId: string;
  accent: string;
  open: boolean;
  onToggle: () => void;
  progress: ReturnType<typeof getLawProgress>;
  defaultOpen?: boolean;
}) {
  const doneCount = chapter.lessons.filter((lesson) => progress[lesson.id]?.completedAt).length;
  const accentSoft = "var(--law-accent-soft)";
  return (
    <section className="law-chapter" style={{ "--law-accent": accent, "--law-accent-soft": accentSoft } as CSSProperties}>
      <button
        type="button"
        className={`law-chapter__head ${open ? "is-open" : ""}`}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="law-chapter__badge">{levelBadge(chapter.level)}</span>
        <strong>{chapter.title}</strong>
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
          {chapter.lessons.map((lesson, index) => {
            const prog = progress[lesson.id];
            return (
              <li key={lesson.id}>
                <PrefetchLink
                  to={`/law/learn/${lesson.id}`}
                  className={`law-lesson-link ${prog?.completedAt ? "is-done" : ""} ${lesson.featured ? "is-featured" : ""}`}
                >
                  <span className="law-lesson-link__no">{String(index + 1).padStart(2, "0")}</span>
                  <span className="law-lesson-link__title">
                    {lesson.featured ? "✨ " : ""}
                    {lesson.title}
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
