import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, TouchEvent as ReactTouchEvent } from "react";
import type { LawGraphic, LawSubjectId } from "../../../types/law";
import { LAW_SUBJECT_MAP } from "../../../data/law/meta";
import { LawMascot } from "../LawMascot";
import { AssembleDiagram } from "./AssembleDiagram";
import { FlowDiagram } from "./FlowDiagram";
import { TreeDiagram } from "./TreeDiagram";
import { TimelineDiagram } from "./TimelineDiagram";
import { BalanceDiagram } from "./BalanceDiagram";
import { StairsDiagram } from "./StairsDiagram";
import { MatrixDiagram } from "./MatrixDiagram";

/** 图解观看进度（本地记忆）：重进显示"上次看到第 N 帧" */
const FRAME_STORE_KEY = "nhb-law-graphic-frame";

function readSavedFrame(lessonId: string): number | null {
  try {
    const raw = localStorage.getItem(FRAME_STORE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, number>;
    const value = map[lessonId];
    return typeof value === "number" && value >= 1 ? value : null;
  } catch {
    return null;
  }
}

function saveFrame(lessonId: string, index: number) {
  try {
    const raw = localStorage.getItem(FRAME_STORE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    map[lessonId] = index;
    localStorage.setItem(FRAME_STORE_KEY, JSON.stringify(map));
  } catch {
    // 隐身模式等 localStorage 不可用：进度记忆静默降级
  }
}

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
    case "matrix":
      return <MatrixDiagram graphic={graphic} active={active} />;
    default:
      return null;
  }
}

/** 知识图解舞台：自动播放 + 手动推进 + 回放 + 触摸滑动翻帧 */
export function GraphicStage({
  graphic,
  subject,
  onExit,
  onEnterLesson,
  lessonLoading = false,
}: {
  graphic: LawGraphic;
  subject: LawSubjectId;
  onExit: () => void;
  onEnterLesson?: (() => void) | null;
  /** 课时数据仍在加载 → "进入本课学习"显示骨架按钮 */
  lessonLoading?: boolean;
}) {
  const subjectMeta = LAW_SUBJECT_MAP[subject];
  const reducedMotion = useReducedMotion();
  const total = graphic.captions.length;
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  // 上次观看进度：挂载时读一次，用户点"继续"才跳——不自动接管播放
  const [resumeFrame, setResumeFrame] = useState<number | null>(null);
  const [captionsOpen, setCaptionsOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const captionsListRef = useRef<HTMLDivElement>(null);
  // 进度落盘门闩：挂载时绝不写帧（否则会把"上次看到第 N 帧"覆盖成 0），
  // 只有用户交互（跳帧/滑动）或自动播放真正推进后才持久化
  const interactedRef = useRef(false);

  useEffect(() => {
    setResumeFrame(readSavedFrame(graphic.lessonId));
    // lessonId 切换时重置播放状态；重置门闩，等新的交互再开始落盘
    setActive(0);
    setPlaying(true);
    setCaptionsOpen(false);
    interactedRef.current = false;
  }, [graphic.lessonId]);

  const advance = useCallback(() => {
    interactedRef.current = true;
    setActive((current) => Math.min(current + 1, total - 1));
  }, [total]);

  const replay = useCallback(() => {
    interactedRef.current = true;
    setActive(0);
    setPlaying(true);
  }, []);

  // 手动跳帧 = 用户接管播放：停在当前帧不再自动推进（曾被 3.2s 定时器抢走导航权）
  const jumpTo = useCallback((index: number) => {
    interactedRef.current = true;
    setPlaying(false);
    setActive(index);
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

  // 观看进度本地记忆：每帧落盘，重进可续看（挂载时门闩未开，绝不覆盖已有进度）
  useEffect(() => {
    if (!interactedRef.current) return;
    saveFrame(graphic.lessonId, active);
  }, [graphic.lessonId, active]);

  // 抽屉打开时把当前字幕滚进视口
  useEffect(() => {
    if (!captionsOpen) return;
    const row = captionsListRef.current?.querySelector<HTMLElement>(`[data-frame="${active}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [captionsOpen, active]);

  // 移动端左右滑动翻帧：滑动即接管播放（与跳帧一致），无新增动画（respects reduced-motion）
  const onTouchStart = useCallback((event: ReactTouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }, []);

  const onTouchEnd = useCallback(
    (event: ReactTouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(dx) < 48) return;
      if (dx < 0) {
        jumpTo(Math.min(active + 1, total - 1));
      } else {
        jumpTo(Math.max(active - 1, 0));
      }
    },
    [active, total, jumpTo],
  );

  const style = {
    "--law-accent": subjectMeta.accent,
    "--law-accent-soft": subjectMeta.accentSoft,
  } as CSSProperties;

  const captionTransition = reducedMotion ? { duration: 0 } : { duration: 0.24 };

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
        <p className="law-graphic__hint">
          {playing ? "▶ 正在自动播放，可随时暂停或手动跳帧" : "⏸ 已暂停：点「播放」继续，或直接跳到想看的帧"}
        </p>
      </div>

      {resumeFrame !== null && resumeFrame < total - 1 ? (
        <div className="law-graphic__resume" role="status">
          <span>🔖 上次看到第 {resumeFrame + 1} 帧</span>
          <button type="button" className="law-graphic__resume-go" onClick={() => jumpTo(resumeFrame)}>
            继续看
          </button>
          <button
            type="button"
            className="law-graphic__resume-dismiss"
            onClick={() => {
              setResumeFrame(null);
              setPlaying(true);
            }}
          >
            从头看
          </button>
        </div>
      ) : null}

      <div
        className="law-graphic__stage"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <DiagramBody graphic={graphic} active={active} />
      </div>

      <div className="law-graphic__caption">
        <AnimatePresence mode="wait">
          <motion.p
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={captionTransition}
          >
            <b>{active + 1} / {total}</b> {graphic.captions[active]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="law-graphic__controls">
        <button
          type="button"
          className="law-graphic__nav"
          onClick={() => jumpTo(Math.max(0, active - 1))}
          disabled={active === 0}
        >
          ← 上一步
        </button>
        <div className="law-graphic__dots">
          {graphic.captions.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`${index === active ? "is-current" : ""} ${index < active ? "is-done" : ""}`}
              onClick={() => jumpTo(index)}
              aria-label={`第 ${index + 1} 步`}
              aria-current={index === active ? "step" : undefined}
            />
          ))}
        </div>
        {active < total - 1 ? (
          <button
            type="button"
            className="law-graphic__nav is-play"
            onClick={() => setPlaying((value) => !value)}
            aria-pressed={playing}
          >
            {playing ? "⏸ 暂停" : "▶ 播放"}
          </button>
        ) : null}
        <button
          type="button"
          className="law-graphic__nav is-primary"
          onClick={active >= total - 1 ? replay : () => jumpTo(active + 1)}
        >
          {active >= total - 1 ? "🔁 从头再看" : "下一步 →"}
        </button>
        <button
          type="button"
          className={`law-graphic__captions-toggle ${captionsOpen ? "is-open" : ""}`}
          onClick={() => setCaptionsOpen((value) => !value)}
          aria-expanded={captionsOpen}
          aria-controls="law-graphic-captions"
          title="字幕列表：点任意一句跳到对应帧"
        >
          ☰ 字幕
        </button>
      </div>

      {captionsOpen ? (
        <div className="law-graphic__captions" id="law-graphic-captions" ref={captionsListRef}>
          {graphic.captions.map((caption, index) => (
            <button
              key={index}
              type="button"
              data-frame={index}
              className={`${index === active ? "is-current" : ""} ${index < active ? "is-done" : ""}`}
              onClick={() => jumpTo(index)}
            >
              <span className="law-graphic__captions-no">{index + 1}</span>
              <span className="law-graphic__captions-text">{caption}</span>
            </button>
          ))}
        </div>
      ) : null}

      {active >= total - 1 ? (
        <div className="law-graphic__finish">
          <LawMascot mood="cheer" size={44} />
          <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 16 }}>
            🎉
          </motion.span>
          <span>图解看完了！接下来去把这节课仔仔细细学一遍 →</span>
          {onEnterLesson ? (
            <button type="button" className="law-graphic__cta" onClick={onEnterLesson}>
              开始本节课学习
            </button>
          ) : lessonLoading ? (
            <button type="button" className="law-graphic__cta is-skeleton" disabled aria-busy="true">
              <span className="law-graphic__cta-skeleton" />
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
      return "🕰️ 时间线";
    case "balance":
      return "⚖️ 对比";
    case "stairs":
      return "🪜 阶梯";
    case "matrix":
      return "🧮 对照矩阵";
    default:
      return "📊 图解";
  }
}
