import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import type { LawBook, LawSubjectId } from "../types/law";
import { collectSiblingTerms, loadLawBook, nextFlowLesson } from "../data/law/loader";
import { LessonPlayer } from "../components/law/player/LessonPlayer";
import { LawMascot } from "../components/law/LawMascot";
import { LawEggListener, useLawImmersive } from "../components/law/EasterEgg";
import "../styles/law-academy.css";
import "../styles/law-diagrams.css";

const SUBJECT_PATTERN = /^([a-z]+)-q/;

export function LawLessonPage() {
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<LawBook | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 沉浸专注模式：隐藏摄影站导航，全屏学习
  useLawImmersive();

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
    for (const chapter of book.chapters) {
      const lesson = chapter.lessons.find((item) => item.id === lessonId);
      if (lesson) return { lesson };
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
          <Link to="/law" className="law-player__cta">← 回学习中心</Link>
        </div>
      </div>
    );
  }

  // 书加载完但课时 id 查不到（改版后旧链接/手误）→ 明确的"未找到"态，
  // 不能和"还在加载"混在一个分支里让用户永远看着"正在打开课件……"
  const notFound = book !== null && lessonRef === null;

  if (error || !subjectId || notFound) {
    return (
      <div className="law-academy">
        <div className="law-notfound">
          <LawMascot mood="oops" size={80} />
          <h1>找不到这节课（{error ?? (notFound ? lessonId : "链接有误")}）</h1>
          <p>可能这节课换了个编号，回目录找找看。</p>
          <Link to="/law" className="law-player__cta">← 回学习中心</Link>
        </div>
      </div>
    );
  }

  if (!book || !lessonRef) {
    return (
      <div className="law-academy">
        <div className="law-loading" aria-live="polite">
          <LawMascot mood="think" size={64} />
          <p>正在打开课件……</p>
        </div>
      </div>
    );
  }

  // 下一课只认"学习流课时"（跳过索引空壳课与附录章）。
  // 不用"全书序号 < lessonCount"判断：序号含空壳/附录课而 lessonCount 不含，
  // 口径不一致会吞掉书尾几十课的「下一课」按钮。
  const next = nextFlowLesson(book, lessonId as string);
  const nextId = next?.id ?? null;
  // 错题本"复习测试"入口：直达自测（无题时播放器会自动退回讲解流程）
  const reviewMode = searchParams.get("review") === "1";

  return (
    <div className="law-academy law-lesson-page">
      <LessonPlayer
        key={lessonId}
        lesson={lessonRef.lesson}
        siblingTerms={siblingTerms}
        initialPhase={reviewMode ? "quiz" : "steps"}
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
      <LawEggListener />
    </div>
  );
}
