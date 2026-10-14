import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { LawSubjectId } from "../types/law";
import { LAW_GRAPHIC_MAP } from "../data/law/graphics";
import { GraphicStage } from "../components/law/diagrams/GraphicStage";
import { LawMascot } from "../components/law/LawMascot";
import { LawEggListener, useLawImmersive } from "../components/law/EasterEgg";
import "../styles/law-academy.css";
import "../styles/law-diagrams.css";
import "../styles/law-visual.css";

const SUBJECT_PATTERN = /^([a-z]+)-q/;

/** 法硕模块不走 useSEO/i18n（内容纯中文）：直接落描述性 document.title（WCAG 2.4.2 Page Titled），离开还原摄影站默认题 */
function useLawPageTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export function LawGraphicPage() {
  useLawImmersive();
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

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

  useLawPageTitle(graphic ? `${graphic.title}（图解）｜奶黄包法硕课堂` : "图解未找到｜奶黄包法硕课堂");

  if (error) {
    return (
      <div className="law-academy">
        <div className="law-notfound">
          <LawMascot mood="oops" size={72} />
          <h1>课件加载失败：{error}</h1>
          <button type="button" className="law-player__cta" onClick={() => navigate("/law")}>
            ← 回学习中心
          </button>
        </div>
      </div>
    );
  }

  if (!graphic || !subjectId) {
    return (
      <div className="law-academy">
        <div className="law-notfound">
          <LawMascot mood="oops" size={72} />
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
        onEnterLesson={() => navigate(`/law/learn/${lessonId}`)}
      />
      <LawEggListener />
    </div>
  );
}
