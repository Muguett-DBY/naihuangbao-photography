import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { LawBook, LawSubjectId } from "../types/law";
import { LAW_GRAPHIC_MAP } from "../data/law/graphics";
import { loadLawBook } from "../data/law/loader";
import { GraphicStage } from "../components/law/diagrams/GraphicStage";
import { LawMascot } from "../components/law/LawMascot";
import "../styles/law-academy.css";
import "../styles/law-diagrams.css";

const SUBJECT_PATTERN = /^([a-z]+)-q/;

export function LawGraphicPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<LawBook | null>(null);

  const graphic = useMemo(
    () => (lessonId ? (LAW_GRAPHIC_MAP[lessonId] ?? null) : null),
    [lessonId],
  );

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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  if (!graphic || !subjectId) {
    return (
      <div className="law-academy">
        <div className="law-notfound">
          <LawMascot mood="oops" size={80} />
          <h1>没有这个图解哦</h1>
          <button type="button" className="law-player__cta" onClick={() => navigate("/law")}>
            ← 回学习中心
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="law-academy law-graphic-page">
      <GraphicStage
        graphic={graphic}
        subject={subjectId}
        onExit={() => navigate(`/law/${subjectId}`)}
        onEnterLesson={
          book
            ? () => navigate(`/law/learn/${lessonId}`)
            : null
        }
      />
    </div>
  );
}
