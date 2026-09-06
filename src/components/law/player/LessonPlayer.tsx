import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router";
import type { LawLesson } from "../../../types/law";
import { buildQuiz } from "../../../lib/law-quiz";
import { getLessonProgress, markStepDone, recordQuiz, touchLesson } from "../../../lib/law-progress";
import { LAW_SUBJECT_MAP } from "../../../data/law/meta";
import { LAW_GRAPHIC_MAP } from "../../../data/law/graphics";
import { StepStage } from "./StepStage";
import { QuizRunner } from "./QuizRunner";
import { LawMascot, type LawMood } from "../LawMascot";
import { CelebrateBurst, KIND_PENDING_HINT, cleanBreadcrumb, kindLabel } from "./lessonHelpers";

type Phase = "steps" | "summary" | "quiz" | "result";

export function LessonPlayer({
  lesson,
  onExit,
  onNextLesson,
  siblingTerms,
  initialPhase = "steps",
}: {
  lesson: LawLesson;
  onExit: () => void;
  onNextLesson?: (() => void) | null;
  /** 同章其他课的概念，仅用于选择题干扰项（答案永远出自本课） */
  siblingTerms?: string[];
  /** 复习模式：跳过讲解步骤，直接进入自测（?review=1） */
  initialPhase?: Phase;
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
  const [navOpen, setNavOpen] = useState(false);
  const [quizAttempt, setQuizAttempt] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const steps = lesson.steps;
  const current = steps[stepIndex];
  const currentStep = current;
  const isCurrentDone = currentStep ? !!stepDone[currentStep.id] : false;
  const totalSteps = steps.length;
  const doneSteps = Object.keys(stepDone).length;
  const graphic = LAW_GRAPHIC_MAP[lesson.id];

  // 自测题确定性生成；总结页依据它决定展示"来自测"还是"标记掌握"
  // （注意不能依赖 phase 计算——总结页时 phase 是 summary，否则自测按钮永远不出现）
  const quiz = useMemo(() => buildQuiz(lesson, siblingTerms), [lesson, siblingTerms]);

  // 复习模式但本课无题可出 → 退回正常学习流程
  useEffect(() => {
    if (phase === "quiz" && quiz.length === 0) setPhase("steps");
  }, [phase, quiz.length]);

  // 自动串联模式：当前步完成后，1.4s 自动进入下一步
  useEffect(() => {
    if (!autoPlay || phase !== "steps" || !isCurrentDone) return;
    const timer = window.setTimeout(() => goNextRef.current(), 1400);
    return () => window.clearTimeout(timer);
  }, [autoPlay, phase, isCurrentDone, stepIndex]);

  const goNextRef = useRef<() => void>(() => {});
  goNextRef.current = () => {
    if (stepIndex < totalSteps - 1) {
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

  function goNext() {
    goNextRef.current();
  }

  function goPrev() {
    if (stepIndex <= 0) return;
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
              <div className="law-player__navpop-menu">
                {steps.map((step, index) => (
                  <button
                    key={step.id}
                    type="button"
                    className={index === stepIndex ? "is-current" : ""}
                    onClick={() => {
                      setStepIndex(index);
                      setNavOpen(false);
                      setMood("idle");
                      setReplayKey((key) => key + 1);
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
          onClick={() => setShowRaw((value) => !value)}
          aria-expanded={showRaw}
        >
          📄 原文对照
        </button>
        <LawMascot mood={mood} size={40} />
      </header>

      {showRaw ? (
        <details className="law-player__rawpanel" open>
          <summary>书中原文（逐页 OCR，与知识点一一对应）</summary>
          <pre>{lesson.raw.join("\n")}</pre>
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
            initial={{ opacity: 0, x: 12 }}
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
                  onClick={() => {
                    setStepIndex(index);
                    setMood("idle");
                    setReplayKey((key) => key + 1);
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              className="law-player__nav is-primary"
              onClick={goNext}
              disabled={!isCurrentDone}
              aria-disabled={!isCurrentDone}
            >
              {isCurrentDone
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
              title="自动串联模式：每一步完成约 1 秒后自动进入下一步"
            >
              🔁 自动
            </button>
          </div>
        </>
      ) : null}

      {phase === "summary" ? (
        <motion.div
          className="law-player__summary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <LawMascot mood="happy" size={72} />
          <h2>本课学完啦！</h2>
          <p>{lesson.title}</p>
          <div className="law-player__summary-info">
            <span>📖 {totalSteps} 个知识点</span>
            <span>✅ {doneSteps} 步已确认掌握</span>
            {lesson.mnemonic ? <span>🧠 口诀：{lesson.mnemonic}</span> : null}
          </div>
          <div className="law-player__summary-actions">
            {quiz.length > 0 ? (
              <>
                <button type="button" className="law-player__cta" onClick={startQuiz}>
                  🎯 来自测一下
                </button>
                <button
                  type="button"
                  className="law-player__skip"
                  onClick={() => {
                    // 跳过自测 ≠ 复习通过：不动错题本的复习阶梯（曾把跳过记成"复习通过"）
                    recordQuiz(lesson.id, 1, 1, totalSteps, { skipped: true });
                    setQuizScore({ correct: 1, total: 1 });
                    setMood("cheer");
                    setPhase("result");
                  }}
                >
                  跳过自测，直接标记掌握 →
                </button>
              </>
            ) : (
              <button
                type="button"
                className="law-player__cta"
                onClick={() => {
                  recordQuiz(lesson.id, 1, 1, totalSteps, { skipped: true });
                  setQuizScore({ correct: 1, total: 1 });
                  setMood("cheer");
                  setPhase("result");
                }}
              >
                🎓 学完了，标记掌握
              </button>
            )}
            {quiz.length === 0 ? (
              <p className="law-player__summary-tip">
                本课是长文讲述型，没有可自动出题的关键词句；直接标记掌握即可。
              </p>
            ) : null}
          </div>
        </motion.div>
      ) : null}

      {phase === "quiz" ? (
        <QuizRunner
          key={quizAttempt}
          items={quiz.slice(0, 4)}
          accent={subject.accent}
          accentSoft={subject.accentSoft}
          onDone={handleQuizDone}
        />
      ) : null}

      {phase === "result" ? (
        <motion.div
          className="law-player__result"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {quizScore.correct >= Math.ceil(quizScore.total / 2) ? <CelebrateBurst /> : null}
          <LawMascot mood={quizScore.correct >= Math.ceil(quizScore.total / 2) ? "cheer" : "oops"} size={84} />
          <h2>
            {quizScore.correct >= Math.ceil(quizScore.total / 2) ? "通过！掌握啦 🎉" : "还差一点，再练一次 💪"}
          </h2>
          <p className="law-player__result-score">
            自测 {quizScore.correct} / {quizScore.total} 题正确
          </p>
          <p className="law-player__result-tip">
            {quizScore.correct >= Math.ceil(quizScore.total / 2)
              ? "明天再看一眼关键词，就会变成长期记忆！"
              : "答错的题已进错题本，明天会提醒你复习——回去把没点透的步骤再走一遍，越慢越牢。"}
          </p>
          <div className="law-player__result-actions">
            <button
              type="button"
              className="law-player__cta"
              onClick={() => {
                // 再学一遍 = 从头快走一遍：保留已完成步骤的勾（可重做但不必重做），
                // 曾在这里清空全部进度，答错一题就要把整课互动重新点一遍
                setStepIndex(0);
                setPhase("steps");
                setMood("idle");
                setReplayKey((key) => key + 1);
              }}
            >
              🔄 再学一遍
            </button>
            {quizScore.correct < Math.ceil(quizScore.total / 2) ? (
              <button type="button" className="law-player__cta is-alternate" onClick={retryQuiz}>
                🔁 再测一次
              </button>
            ) : null}
            {onNextLesson ? (
              <button type="button" className="law-player__cta is-alternate" onClick={onNextLesson}>
                下一课 →
              </button>
            ) : (
              <button type="button" className="law-player__cta is-alternate" onClick={onExit}>
                全部学完了！返回目录
              </button>
            )}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}

