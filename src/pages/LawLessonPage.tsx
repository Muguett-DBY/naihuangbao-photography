import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import type { LawSubjectId } from "../types/law";
import { loadLawLessonView, type LawLessonView } from "../data/law/loader";
import { LessonPlayer } from "../components/law/player/LessonPlayer";
import { LawLoadingSkeleton } from "../components/law/LawLoadingSkeleton";
import { LawMascot } from "../components/law/LawMascot";
import { LawEggListener, useLawImmersive } from "../components/law/EasterEgg";
import "../styles/law-academy.css";
import "../styles/law-diagrams.css";

const SUBJECT_PATTERN = /^([a-z]+)-q/;

export function LawLessonPage() {
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // view === "missing" 表示书加载成功但课时 id 不存在（旧链接/手误），与加载失败区分
  const [view, setView] = useState<LawLessonView | "missing" | null>(null);
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
    if (!subjectId || !lessonId) return;
    let cancelled = false;
    setView(null);
    setError(null);
    loadLawLessonView(subjectId, lessonId)
      .then((loaded) => {
        if (!cancelled) setView(loaded ?? "missing");
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [subjectId, lessonId]);

  const siblingTerms = view && view !== "missing" ? view.siblingTerms : [];
  const nextId = view && view !== "missing" ? view.nextFlowId : null;

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
  // 不能和"还在加载"混在一个分支里让用户永远看着加载动画
  const notFound = view === "missing";

  if (notFound) {
    return (
      <div className="law-academy">
        <div className="law-notfound">
          <LawMascot mood="oops" size={80} />
          <h1>找不到这节课（{lessonId}）</h1>
          <p>可能这节课换了个编号，回目录找找看。</p>
          <Link to="/law" className="law-player__cta">← 回学习中心</Link>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="law-academy">
        <LawLoadingSkeleton label="正在打开课件" variant="lesson" />
      </div>
    );
  }

  // 下一课只认"学习流课时"（跳过索引空壳课与附录章），语义与整本版 nextFlowLesson 等价
  // （loader-chunks.test.ts 逐课锁定）；错题本"复习测试"入口：?review=1 直达自测
  const reviewMode = searchParams.get("review") === "1";

  return (
    <div className="law-academy law-lesson-page">
      <LessonPlayer
        key={lessonId}
        lesson={view.lesson}
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
