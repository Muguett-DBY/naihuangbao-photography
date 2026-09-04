import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { LawGraphic, LawSubjectId } from "../../../types/law";
import { LAW_SUBJECT_MAP } from "../../../data/law/meta";
import { AssembleDiagram } from "./AssembleDiagram";
import { FlowDiagram } from "./FlowDiagram";
import { TreeDiagram } from "./TreeDiagram";
import { TimelineDiagram } from "./TimelineDiagram";
import { BalanceDiagram } from "./BalanceDiagram";
import { StairsDiagram } from "./StairsDiagram";

function DiagramBody({ graphic, active }: { graphic: LawGraphic; active: number }) {
  switch (graphic.kind) {
    case "assemble":
      return <AssembleDiagram graphic={graphic} active={active} />;
    case "flow":
      return <FlowDiagram graphic={graphic} active={active} />;
    case "tree":
      return <TreeDiagram graphic={graphic} active={active} />;
    case "timeline":
      return <TimelineDiagram graphic={graphic} active={active} />;
    case "balance":
      return <BalanceDiagram graphic={graphic} active={active} />;
    case "stairs":
      return <StairsDiagram graphic={graphic} active={active} />;
    default:
      return null;
  }
}

/** 知识图解舞台：自动播放 + 手动推进 + 回放 */
export function GraphicStage({
  graphic,
  subject,
  onExit,
  onEnterLesson,
}: {
  graphic: LawGraphic;
  subject: LawSubjectId;
  onExit: () => void;
  onEnterLesson?: (() => void) | null;
}) {
  const subjectMeta = LAW_SUBJECT_MAP[subject];
  const total = graphic.captions.length;
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);

  const advance = useCallback(() => {
    setActive((current) => Math.min(current + 1, total - 1));
  }, [total]);

  const replay = useCallback(() => {
    setActive(0);
    setPlaying(true);
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (active >= total - 1) {
      setPlaying(false);
      // 第一次完整看完图解 → 派发彩蛋事件（"第一次看图解"）
      document.dispatchEvent(new CustomEvent("nhb-law-egg", { detail: "graphicFirst" }));
      return;
    }
    const timer = window.setTimeout(advance, 3200);
    return () => window.clearTimeout(timer);
  }, [active, playing, advance, total]);

  const style = {
    "--law-accent": subjectMeta.accent,
    "--law-accent-soft": subjectMeta.accentSoft,
  } as CSSProperties;

  return (
    <div className="law-graphic" style={style}>
      <header className="law-graphic__bar">
        <button type="button" className="law-player__back" onClick={onExit}>
          ← {subjectMeta.name}
        </button>
        <div className="law-graphic__title">{graphic.title}</div>
        <span className="law-graphic__kind">{kindLabel(graphic.kind)}</span>
      </header>

      <div className="law-graphic__intro">
        <p>{graphic.intro}</p>
        <p className="law-graphic__hint">🖱️ 点点画面没反应？手动点下面的"下一步"也行～</p>
      </div>

      <div className="law-graphic__stage">
        <DiagramBody graphic={graphic} active={active} />
      </div>

      <div className="law-graphic__caption">
        <AnimatePresence mode="wait">
          <motion.p
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24 }}
          >
            <b>{active + 1} / {total}</b> {graphic.captions[active]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="law-graphic__controls">
        <button
          type="button"
          className="law-graphic__nav"
          onClick={() => setActive((current) => Math.max(0, current - 1))}
          disabled={active === 0}
        >
          ← 上一步
        </button>
        <div className="law-graphic__dots" aria-hidden="true">
          {graphic.captions.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`${index === active ? "is-current" : ""} ${index < active ? "is-done" : ""}`}
              onClick={() => setActive(index)}
              aria-label={`第 ${index + 1} 步`}
            />
          ))}
        </div>
        <button
          type="button"
          className="law-graphic__nav is-primary"
          onClick={active >= total - 1 ? replay : advance}
        >
          {active >= total - 1 ? "🔁 从头再看" : "下一步 →"}
        </button>
      </div>

      {active >= total - 1 ? (
        <div className="law-graphic__finish">
          <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
            🎉
          </motion.span>
          <span>图解看完了！接下来去把这节课仔仔细细学一遍 →</span>
          {onEnterLesson ? (
            <button type="button" className="law-graphic__cta" onClick={onEnterLesson}>
              开始本节课学习
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "assemble":
      return "🧩 装配";
    case "flow":
      return "🔗 流程";
    case "tree":
      return "🌳 体系树";
    case "timeline":
      return "🕰️ 时间轴";
    case "balance":
      return "⚖️ 天平";
    case "stairs":
      return "🪜 阶梯";
    default:
      return "📊 图解";
  }
}

export function GraphicSkeleton({ children }: { children: ReactNode }) {
  return <div className="law-graphic__stage">{children}</div>;
}

export function useGraphicTour(graphic: LawGraphic) {
  const total = useMemo(() => graphic.captions.length, [graphic]);
  return { total };
}
