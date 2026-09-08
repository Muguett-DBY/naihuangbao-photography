import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router";
import type { LawLesson } from "../../../types/law";
import { buildQuiz } from "../../../lib/law-quiz";
import { getLessonProgress, markStepDone, recordQuiz, touchLesson } from "../../../lib/law-progress";
import { LAW_SUBJECT_MAP } from "../../../data/law/meta";
import { LAW_GRAPHIC_MAP } from "../../../data/law/graphics";
import { StepStage } from "./StepStage";
import { QuizRunner } from "./QuizRunner";
import { useLessonHydration } from "./useLessonHydration";
import { LawMascot, type LawMood } from "../LawMascot";
import { KIND_PENDING_HINT, cleanBreadcrumb, kindLabel } from "./lessonHelpers";
import { ResultPhase, SummaryPhase } from "./LessonPhases";
import "../../../styles/law-visual.css";

type Phase = "steps" | "summary" | "quiz" | "result";

/** 自动串联速度三档（持久化）：每步完成后停留多久进下一步 */
const AUTO_SPEEDS = [
  { id: "slow", label: "🐢 慢", delay: 2600 },
  { id: "mid", label: "▶ 中", delay: 1400 },
  { id: "fast", label: "🐇 快", delay: 800 },
] as const;
type AutoSpeedId = (typeof AUTO_SPEEDS)[number]["id"];
const AUTO_SPEED_KEY = "nhb-law-autoplay-speed";

function readAutoSpeed(): AutoSpeedId {
  try {
    const saved = localStorage.getItem(AUTO_SPEED_KEY);
    return AUTO_SPEEDS.some((s) => s.id === saved) ? (saved as AutoSpeedId) : "mid";
  } catch {
    return "mid";
  }
}

export function LessonPlayer({
  lesson,
  onExit,
  onNextLesson,
  siblingTerms,
  initialPhase = "steps",
  restLoader,
  lightBoundary = 0,
}: {
  lesson: LawLesson;
  onExit: () => void;
  onNextLesson?: (() => void) | null;
  /** 同章其他课的概念，仅用于选择题干扰项（答案永远出自本课） */
  siblingTerms?: string[];
  /** 复习模式：跳过讲解步骤，直接进入自测（?review=1） */
  initialPhase?: Phase;
  /** 课内分层（巨型课治理）：拉取余下步骤全文，resolve 拼合后的完整课；未分层课为空 */
  restLoader?: () => Promise<LawLesson>;
  /** 课内分层：lesson.steps 前 lightBoundary 步为全文，其后是占位元数据 */
  lightBoundary?: number;
}) {
  const subject = LAW_SUBJECT_MAP[lesson.subject];
  const [phase, setPhase] = useState<Phase>(initialPhase);
  // 断点续学：已点过的互动直接恢复，并跳到第一个没完成的步骤（中途退出不再等于白学）
  const [stepIndex, setStepIndex] = useState<number>(() => {
    const saved = getLessonProgress(lesson.id);
    if (!saved) return 0;
    const firstUndone = lesson.steps.findIndex((step) => !saved.stepsDone[step.id]);
    return firstUndone === -1 ? 0 : firstUndone;
  });
  const [stepDone, setStepDone] = useState<Record<string, boolean>>(() => {
    const saved = getLessonProgress(lesson.id);
    const restored: Record<string, boolean> = {};
    for (const step of lesson.steps) {
      if (saved?.stepsDone[step.id]) restored[step.id] = true;
    }
    return restored;
  });
  const [mood, setMood] = useState<LawMood>("idle");
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });
  const [replayKey, setReplayKey] = useState(0);
  const [showRaw, setShowRaw] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoSpeed, setAutoSpeed] = useState<AutoSpeedId>(readAutoSpeed);
  const [navOpen, setNavOpen] = useState(false);
  // 段落导航浮层的键盘游标（>20 步长课：上下键选择，回车跳转）
  const [navHighlight, setNavHighlight] = useState(0);
  // 步骤前进/后退的方向感：新内容沿行进方向滑入
  const [direction, setDirection] = useState(1);
  const navMenuRef = useRef<HTMLDivElement>(null);
  const [quizAttempt, setQuizAttempt] = useState(0);
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // 课内分层：全文水合态。水合前 steps 尾部是占位元数据（推进到边界才拉全文）
  const { hydrated, ensureRest } = useLessonHydration(restLoader, lightBoundary, stepIndex, phase);
  const activeLesson = hydrated ?? lesson;

  const steps = activeLesson.steps;
  // 占位步骤（全文未到）：不可判定完成、不可推进、不渲染步面
  const currentIsPlaceholder = restLoader !== undefined && !hydrated && stepIndex >= lightBoundary;
  const currentStep = currentIsPlaceholder ? undefined : steps[stepIndex];
  const isCurrentDone = currentStep ? !!stepDone[currentStep.id] : false;
  const totalSteps = steps.length;
  const doneSteps = Object.keys(stepDone).length;
  const graphic = LAW_GRAPHIC_MAP[lesson.id];

  // 自测题确定性生成；总结页依据它决定展示"来自测"还是"标记掌握"
  // （注意不能依赖 phase 计算——总结页时 phase 是 summary，否则自测按钮永远不出现）
  const quiz = useMemo(() => buildQuiz(activeLesson, siblingTerms), [activeLesson, siblingTerms]);

  // 复习模式但本课无题可出 → 退回正常学习流程
  // （分层课全文未到时先等水合——占位步骤不产题，不能据此误判"无题"）
  useEffect(() => {
    if (phase !== "quiz" || quiz.length > 0) return;
    if (restLoader && !hydrated) return;
    setPhase("steps");
  }, [phase, quiz.length, restLoader, hydrated]);

  // 自动串联模式：当前步完成后按所选档位的间隔自动进入下一步（速度持久化）
  const autoDelay = AUTO_SPEEDS.find((s) => s.id === autoSpeed)?.delay ?? 1400;
  useEffect(() => {
    if (!autoPlay || phase !== "steps" || !isCurrentDone) return;
    const timer = window.setTimeout(() => goNextRef.current(), autoDelay);
    return () => window.clearTimeout(timer);
  }, [autoPlay, phase, isCurrentDone, stepIndex, autoDelay]);

  // 速度档位落盘
  useEffect(() => {
    try {
      localStorage.setItem(AUTO_SPEED_KEY, autoSpeed);
    } catch {
      // localStorage 不可用：档位仅本次会话生效
    }
  }, [autoSpeed]);

  // 打开段落导航时键盘游标落在当前步；浮层滚动跟随游标
  useEffect(() => {
    if (navOpen) setNavHighlight(stepIndex);
  }, [navOpen, stepIndex]);

  useEffect(() => {
    if (!navOpen) return;
    const item = navMenuRef.current?.querySelector<HTMLElement>('[data-highlight="true"]');
    item?.scrollIntoView({ block: "nearest" });
  }, [navOpen, navHighlight]);

  const goNextRef = useRef<() => void>(() => {});
  goNextRef.current = () => {
    if (stepIndex < totalSteps - 1) {
      setDirection(1);
      setStepIndex((index) => index + 1);
      setMood("idle");
      setReplayKey((key) => key + 1);
    } else {
      touchLesson(lesson.id);
      setPhase("summary");
    }
  };

  function handleStepDone() {
    if (!currentStep) return;
    setStepDone((prev) => {
      const next = { ...prev, [currentStep.id]: true };
      markStepDone(lesson.id, currentStep.id);
      return next;
    });
    setMood("happy");
  }

  function jumpToStep(index: number) {
    setDirection(index > stepIndex ? 1 : -1);
    setStepIndex(index);
    setMood("idle");
    setReplayKey((key) => key + 1);
  }

  function goNext() {
    goNextRef.current();
  }

  function goPrev() {
    if (stepIndex <= 0) return;
    setDirection(-1);
    setStepIndex((index) => index - 1);
    setMood("idle");
    setReplayKey((key) => key + 1);
  }

  function startQuiz() {
    setPhase("quiz");
    setMood("idle");
  }

  function retryQuiz() {
    setQuizAttempt((attempt) => attempt + 1);
    setPhase("quiz");
    setMood("idle");
  }

  function handleQuizDone(correct: number, total: number, _wrong: number) {
    // 及格线语义在 recordQuiz 内统一：不及格才进错题本，及格推进复习阶梯——
    // 结果页的"通过/错题本"文案从此和实际状态一致
    recordQuiz(lesson.id, correct, total, totalSteps);
    setQuizScore({ correct, total });
    setMood(correct >= Math.ceil(total / 2) ? "cheer" : "idle");
    setPhase("result");
  }

  // 换步滚动管理：长文步骤点"下一步"后，新内容从视口上方开始，把画面带回课件顶部。
  // 首次挂载不滚——否则会把顶栏（返回按钮）滚出视口，移动端像"被困在课时里"
  const mountedRef = useRef(false);
  useEffect(() => {
    if (phase !== "steps") return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    stageRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [stepIndex, phase]);

  // 键盘导航：← 上一步，→ 下一步（仅在可用时生效），复习老课不用来回挪鼠标
  useEffect(() => {
    if (phase !== "steps") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft") {
        goPrev();
      } else if (event.key === "ArrowRight" && isCurrentDone) {
        goNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const style = {
    "--law-accent": subject.accent,
    "--law-accent-soft": subject.accentSoft,
  } as CSSProperties;

  return (
    <div className={`law-player law-player--${subject.id}`} style={style} ref={rootRef}>
      <header className="law-player__bar">
        <button type="button" className="law-player__back" onClick={onExit}>
          ← {subject.name}
        </button>
        <div className="law-player__crumb">{cleanBreadcrumb(lesson.breadcrumb).join(" / ")}</div>
        {graphic ? (
          <Link className="law-player__graphic" to={`/law/graphic/${lesson.id}`}>
            📐 图解
          </Link>
        ) : null}
        {totalSteps > 8 ? (
          <div className="law-player__navpop">
            <button
              type="button"
              className={`law-player__navpop-btn ${navOpen ? "is-open" : ""}`}
              onClick={() => setNavOpen((value) => !value)}
              aria-expanded={navOpen}
            >
              🧭 段落导航
            </button>
            {navOpen ? (
              <div
                className="law-player__navpop-menu"
                ref={navMenuRef}
                role="listbox"
                aria-label="段落导航"
                tabIndex={-1}
                onKeyDown={(event) => {
                  // 长课键盘导航：上下选择、回车跳转、Esc 关闭
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setNavHighlight((h) => {
                      const next = event.key === "ArrowDown" ? Math.min(h + 1, totalSteps - 1) : Math.max(h - 1, 0);
                      return next;
                    });
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    jumpToStep(navHighlight);
                    setNavOpen(false);
                  } else if (event.key === "Escape") {
                    setNavOpen(false);
                  }
                }}
              >
                {steps.map((step, index) => (
                  <button
                    key={step.id}
                    type="button"
                    role="option"
                    aria-selected={index === stepIndex}
                    data-highlight={index === navHighlight || undefined}
                    className={
                      (index === stepIndex ? "is-current " : "") +
                      (index === navHighlight ? "is-highlight" : "")
                    }
                    onMouseEnter={() => setNavHighlight(index)}
                    onFocus={() => setNavHighlight(index)}
                    onClick={() => {
                      jumpToStep(index);
                      setNavOpen(false);
                    }}
                  >
                    {String(index + 1).padStart(2, "0")} · {kindLabel(step.kind)} · {step.text.slice(0, 18)}…
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          className={`law-player__raw ${showRaw ? "is-open" : ""}`}
          onClick={() => {
            setShowRaw((value) => !value);
            // 原文对照需要完整原文：分层课在此拉尾部全文
            ensureRest();
          }}
          aria-expanded={showRaw}
        >
          📄 原文对照
        </button>
        <LawMascot mood={mood} size={40} />
      </header>

      {showRaw ? (
        <details className="law-player__rawpanel" open>
          <summary>书中原文（逐页 OCR，与知识点一一对应）</summary>
          <pre>{activeLesson.raw.join("\n")}</pre>
        </details>
      ) : null}

      {phase === "steps" ? (
        <>
          <div className="law-player__progress-track" aria-hidden="true">
            <motion.div
              className="law-player__progress"
              animate={{ width: `${(doneSteps / Math.max(totalSteps, 1)) * 100}%` }}
            />
          </div>
          <div className="law-player__meta">
            <span className="law-player__counter">
              第 {stepIndex + 1} / {totalSteps} 步 · 已掌握 {doneSteps} 步
            </span>
            <span className={`law-player__kind law-kind--${currentStep?.kind ?? "plain"}`}>
              {currentStep ? kindLabel(currentStep.kind) : ""}
            </span>
          </div>

          <motion.div
            ref={stageRef}
            className="law-player__stage"
            key={`${stepIndex}-${replayKey}`}
            initial={reducedMotion ? false : { opacity: 0, x: 20 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22 }}
          >
            {currentStep ? (
              <StepStage
                step={currentStep}
                accent={subject.accent}
                accentSoft={subject.accentSoft}
                onDone={handleStepDone}
              />
            ) : currentIsPlaceholder ? (
              <p className="law-player__restloading" role="status">
                正在加载本课剩余全文……
              </p>
            ) : null}
          </motion.div>

          <div className="law-player__controls">
            <button
              type="button"
              className="law-player__nav"
              onClick={goPrev}
              disabled={stepIndex === 0}
            >
              ← 上一步
            </button>
            <div className="law-player__dots">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  aria-label={`跳到第 ${index + 1} 步`}
                  className={`law-player__dot ${index === stepIndex ? "is-current" : ""} ${doneSteps > index ? "is-done" : ""}`}
                  onClick={() => jumpToStep(index)}
                />
              ))}
            </div>
            <button
              type="button"
              className="law-player__nav is-primary"
              onClick={goNext}
              disabled={!isCurrentDone || currentIsPlaceholder}
              aria-disabled={!isCurrentDone || currentIsPlaceholder}
            >
              {currentIsPlaceholder
                ? "全文加载中…"
                : isCurrentDone
                  ? stepIndex === totalSteps - 1
                    ? "完成本课 →"
                    : "下一步 →"
                  : currentStep
                    ? KIND_PENDING_HINT[currentStep.kind] ?? "先完成上面的小任务哦"
                    : "先完成上面的小任务哦"}
            </button>
            <button
              type="button"
              className={`law-player__auto ${autoPlay ? "is-on" : ""}`}
              onClick={() => setAutoPlay((value) => !value)}
              aria-pressed={autoPlay}
              title="自动串联模式：每一步完成后按所选速度自动进入下一步"
            >
              🔁 自动
            </button>
            {autoPlay ? (
              <div className="law-player__autospeed" role="group" aria-label="自动串联速度">
                {AUTO_SPEEDS.map((speed) => (
                  <button
                    key={speed.id}
                    type="button"
                    className={autoSpeed === speed.id ? "is-active" : ""}
                    aria-pressed={autoSpeed === speed.id}
                    onClick={() => setAutoSpeed(speed.id)}
                    title={`自动串联：${speed.label}（${speed.delay / 1000} 秒后进入下一步）`}
                  >
                    {speed.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {phase === "summary" ? (
        <SummaryPhase
          lesson={activeLesson}
          totalSteps={totalSteps}
          doneSteps={doneSteps}
          quizCount={quiz.length}
          onStartQuiz={startQuiz}
          onSkipQuiz={() => {
            // 跳过自测 ≠ 复习通过：不动错题本的复习阶梯（曾把跳过记成"复习通过"）
            recordQuiz(lesson.id, 1, 1, totalSteps, { skipped: true });
            setQuizScore({ correct: 1, total: 1 });
            setMood("cheer");
            setPhase("result");
          }}
        />
      ) : null}

      {phase === "quiz" ? (
        // 分层课全文未到不出卷（占位步骤产不出题，等水合完成再渲染 QuizRunner）
        restLoader && !hydrated ? (
          <p className="law-player__restloading" role="status">正在装订全文，马上可以开测……</p>
        ) : (
          <QuizRunner
            key={quizAttempt}
            items={quiz.slice(0, 4)}
            accent={subject.accent}
            accentSoft={subject.accentSoft}
            onDone={handleQuizDone}
          />
        )
      ) : null}

      {phase === "result" ? (
        <ResultPhase
          quizScore={quizScore}
          onRestart={() => {
            // 再学一遍 = 从头快走一遍：保留已完成步骤的勾（可重做但不必重做），
            // 曾在这里清空全部进度，答错一题就要把整课互动重新点一遍
            setStepIndex(0);
            setPhase("steps");
            setMood("idle");
            setReplayKey((key) => key + 1);
          }}
          onRetryQuiz={retryQuiz}
          onNextLesson={onNextLesson}
          onExit={onExit}
        />
      ) : null}
    </div>
  );
}

