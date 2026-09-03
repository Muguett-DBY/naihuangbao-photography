import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { LawBook, LawSubjectId } from "../types/law";
import { LAW_SUBJECT_MAP } from "../data/law/meta";
import { collectSiblingTerms, loadLawBook } from "../data/law/loader";
import { LAW_GRAPHIC_MAP } from "../data/law/graphics";
import { LessonPlayer } from "../components/law/player/LessonPlayer";
import { LawMascot } from "../components/law/LawMascot";
import "../styles/law-academy.css";
import "../styles/law-diagrams.css";

const SUBJECT_PATTERN = /^([a-z]+)-q/;

export function LawLessonPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<LawBook | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subjectId = useMemo<LawSubjectId | null>(() => {
    const match = SUBJECT_PATTERN.exec(lessonId ?? "");
    const id = match?.[1];
    return id === "falixue" || id === "xianfa" || id === "zhishixiang" || id === "minfa" || id === "xingfa"
      ? id
      : null;
  }, [lessonId]);

  useEffect(() => {
    if (!subjectId) return;
    let cancelled = false;
    loadLawBook(subjectId)
      .then((loaded) => {
        if (!cancelled) setBook(loaded);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const lessonRef = useMemo(() => {
    if (!book || !lessonId) return null;
    let order = 0;
    for (const chapter of book.chapters) {
      for (const lesson of chapter.lessons) {
        order += 1;
        if (lesson.id === lessonId) {
          return { lesson, order, total: book.lessonCount };
        }
      }
    }
    return null;
  }, [book, lessonId]);

  const siblingTerms = useMemo(
    () => (book && lessonId ? collectSiblingTerms(book, lessonId) : []),
    [book, lessonId],
  );

  if (error || !subjectId) {
    return (
      <div className="law-academy">
        <div className="law-notfound">
          <LawMascot mood="oops" size={80} />
          <h1>找不到这节课（{error ?? "链接有误"}）</h1>
          <a href="/law" className="law-player__cta">← 回学习中心</a>
        </div>
      </div>
    );
  }

  if (!book || !lessonRef) {
    return (
      <div className="law-academy">
        <div className="law-loading">
          <LawMascot mood="think" size={64} />
          <p>正在打开课件……</p>
        </div>
      </div>
    );
  }

  const next = lessonRef.order < lessonRef.total ? nextLessonOf(book, lessonId as string) : null;
  const nextId = next?.id ?? null;

  return (
    <div className="law-academy law-lesson-page">
      {lessonId && LAW_GRAPHIC_MAP[lessonId] ? (
        <Link
          to={`/law/graphic/${lessonId}`}
          className="law-lesson-graphic-entry"
          style={{ "--law-accent": LAW_SUBJECT_MAP[subjectId].accent } as CSSProperties}
        >
          <span className="law-lesson-graphic-entry__icon">📐</span>
          <span>
            <b>{LAW_GRAPHIC_MAP[lessonId].title}</b>
            <small>这节课有图解动画——先看知识点怎么"动"起来，再进入逐句讲解</small>
          </span>
          <span className="law-lesson-graphic-entry__go">打开图解 →</span>
        </Link>
      ) : null}
      <LessonPlayer
        key={lessonId}
        lesson={lessonRef.lesson}
        siblingTerms={siblingTerms}
        onExit={() => {
          navigate(`/law/${subjectId}`);
        }}
        onNextLesson={
          nextId
            ? () => {
                navigate(`/law/learn/${nextId}`);
              }
            : null
        }
      />
    </div>
  );
}

function nextLessonOf(book: LawBook, lessonId: string) {
  const lessons: { id: string }[] = [];
  for (const chapter of book.chapters) {
    for (const lesson of chapter.lessons) lessons.push(lesson);
  }
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  return index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
}
