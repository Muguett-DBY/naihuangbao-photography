import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router";
import { motion } from "framer-motion";
import type { LawBook, LawChapter, LawLesson } from "../types/law";
import { LAW_SUBJECT_MAP } from "../data/law/meta";
import { graphicsOfSubject } from "../data/law/graphics";
import { loadLawBook } from "../data/law/loader";
import {
  getLastLessonId,
  getLawProgress,
  getTodayGoal,
  getWrongLessons,
} from "../lib/law-progress";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import { LawMascot } from "../components/law/LawMascot";
import { LawEggListener } from "../components/law/EasterEgg";
import { LawSearch } from "../components/law/subject/LawSearch";
import { ChapterTree } from "../components/law/subject/ChapterTree";
import {
  buildQuickPacks,
  findLessonInBook,
  lessonMeta,
  semanticChapterTitle,
} from "../components/law/subject/subjectUtils";
import "../styles/law-academy.css";
import "../styles/law-diagrams.css";

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
  const today = useMemo(() => getTodayGoal(), []);
  const wrongIds = useMemo(() => new Set(getWrongLessons()), []);

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
  const graphics = graphicsOfSubject(subject.id);
  const graphicIds = new Set(graphics.map((g) => g.lessonId));

  // 继续学习
  const lastLessonId = getLastLessonId();
  const lastRef = lastLessonId ? findLessonInBook(book, lastLessonId) : null;

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
        <div className="law-subject__goal" aria-label="今日目标">
          <span>🎯 今日目标</span>
          <b>{today.done >= today.target ? "达成！⭐" : `${today.done}/${today.target} 课`}</b>
          <div className="law-subject__goal-bar">
            <span style={{ width: `${Math.min(100, (today.done / today.target) * 100)}%` }} />
          </div>
        </div>
      </header>

      <LawSearch book={book} onPick={(lessonId) => { window.location.href = `/law/learn/${lessonId}`; }} />

      {lastRef ? (
        <section className="law-subject__resume">
          <PrefetchLink to={`/law/learn/${lastRef.lesson.id}`} className="law-subject__resume-card">
            <span className="law-subject__resume-icon">⏱️</span>
            <span>
              <b>继续上次的学习</b>
              <small>{lastRef.chapter.title ? semanticChapterTitle(lastRef.chapter) : ""} · {lastRef.lesson.title}</small>
            </span>
            <span className="law-subject__resume-go">继续 →</span>
          </PrefetchLink>
        </section>
      ) : null}

      {wrongIds.size > 0 ? (
        <section className="law-subject__wrong">
          <header>
            <h2>📕 我的错题本（{wrongIds.size}）</h2>
            <span>自测答错的课都在这里，重练一次就记牢</span>
          </header>
          <div className="law-subject__wrong-list">
            {[...wrongIds].slice(0, 6).map((id) => {
              const ref = findLessonInBook(book, id);
              if (!ref) return null;
              return (
                <PrefetchLink key={id} to={`/law/learn/${id}`} className="law-subject__wrong-item">
                  <b>{ref.lesson.title}</b>
                  <span>{ref.chapter.title ? semanticChapterTitle(ref.chapter) : ""} · 🔁 重练</span>
                </PrefetchLink>
              );
            })}
          </div>
        </section>
      ) : null}

      {graphics.length > 0 ? (
        <section className="law-subject__graphics" aria-label={`${subject.name}图解课堂`}>
          <header className="law-graphics-head">
            <h2>📐 图解课堂 · 先看动画懂概念</h2>
            <span>打开对应课程时，也可以从课时顶部进入</span>
          </header>
          <div className="law-graphics-grid">
            {graphics.map((graphic, index) => (
              <motion.div
                key={graphic.lessonId}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.05 }}
              >
                <PrefetchLink
                  to={`/law/learn/${graphic.lessonId}`}
                  className="law-graphic-card"
                  style={{ "--law-accent": subject.accent, "--law-accent-soft": subject.accentSoft } as CSSProperties}
                >
                  <span className="law-graphic-card__kind">{graphicKindEmoji(graphic.kind)}</span>
                  <span className="law-graphic-card__body">
                    <strong>{graphic.title}</strong>
                    <small>进入课程后，可在课时顶部打开图解动画</small>
                  </span>
                  <span className="law-graphic-card__go">去上课 →</span>
                </PrefetchLink>
              </motion.div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="law-subject__chapters">
        {book.chapters.map((chapter) => (
          <ChapterTree
            key={chapter.id}
            chapter={chapter}
            graphicIds={graphicIds}
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

      <LawEggListener />
    </div>
  );
}

function graphicKindEmoji(kind: string): string {
  switch (kind) {
    case "assemble":
      return "🧩";
    case "flow":
      return "🔗";
    case "tree":
      return "🌳";
    case "timeline":
      return "🕰️";
    case "balance":
      return "⚖️";
    case "stairs":
      return "🪜";
    default:
      return "📊";
  }
}

export function lawLessonType(lesson: LawLesson) {
  return lesson.steps[0]?.kind ?? "plain";
}

export { buildQuickPacks, lessonMeta, semanticChapterTitle };
export type { LawChapter, LawLesson };
