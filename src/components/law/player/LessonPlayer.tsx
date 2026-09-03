import { useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import type { LawLesson } from "../../../types/law";
import { buildQuiz } from "../../../lib/law-quiz";
import { markStepDone, recordQuiz, touchLesson } from "../../../lib/law-progress";
import { LAW_SUBJECT_MAP } from "../../../data/law/meta";
import { StepStage } from "./StepStage";
import { QuizRunner } from "./QuizRunner";
import { LawMascot, type LawMood } from "../LawMascot";

type Phase = "steps" | "summary" | "quiz" | "result";

export function LessonPlayer({
  lesson,
  onExit,
  onNextLesson,
}: {
  lesson: LawLesson;
  onExit: () => void;
  onNextLesson?: (() => void) | null;
}) {
  const subject = LAW_SUBJECT_MAP[lesson.subject];
  const [phase, setPhase] = useState<Phase>("steps");
  const [stepIndex, setStepIndex] = useState(0);
  const [stepDone, setStepDone] = useState<Record<string, boolean>>({});
  const [mood, setMood] = useState<LawMood>("idle");
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });
  const [replayKey, setReplayKey] = useState(0);
  const [showRaw, setShowRaw] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const steps = lesson.steps;
  const current = steps[stepIndex];
  const currentStep = current;
  const isCurrentDone = currentStep ? !!stepDone[currentStep.id] : false;
  const totalSteps = steps.length;
  const doneSteps = Object.keys(stepDone).length;

  const quiz = useMemo(() => (phase === "quiz" ? buildQuiz(lesson) : []), [phase, lesson]);

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
    if (stepIndex < totalSteps - 1) {
      setStepIndex((index) => index + 1);
      setMood("idle");
      setReplayKey((key) => key + 1);
      return;
    }
    touchLesson(lesson.id);
    setPhase("summary");
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

  function handleQuizDone(correct: number, total: number) {
    recordQuiz(lesson.id, correct, total, totalSteps);
    setQuizScore({ correct, total });
    setMood("cheer");
    setPhase("result");
  }

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
        <div className="law-player__crumb">{lesson.breadcrumb.join(" / ")}</div>
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
            className="law-player__stage"
            key={`${stepIndex}-${replayKey}`}
            initial={{ opacity: 0, x: 26 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -26 }}
            transition={{ duration: 0.28 }}
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
            <div className="law-player__dots" aria-hidden="true">
              {steps.map((step, index) => (
                <span
                  key={step.id}
                  className={`${index === stepIndex ? "is-current" : ""} ${doneSteps > index ? "is-done" : ""}`}
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
                : "先完成上面的小互动"}
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
            <button type="button" className="law-player__cta" onClick={startQuiz}>
              🎯 来自测一下
            </button>
          </div>
        </motion.div>
      ) : null}

      {phase === "quiz" ? (
        <QuizRunner
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
              : "别着急——回去把没点透的步骤再走一遍，越慢越牢。"}
          </p>
          <div className="law-player__result-actions">
            <button
              type="button"
              className="law-player__cta"
              onClick={() => {
                setStepIndex(0);
                setStepDone({});
                setPhase("steps");
                setMood("idle");
              }}
            >
              🔄 再学一遍
            </button>
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

function kindLabel(kind: string): string {
  switch (kind) {
    case "definition":
      return "📖 定义";
    case "list":
      return "🗂️ 列举";
    case "compare":
      return "⚖️ 对比";
    case "mnemonic":
      return "🧠 口诀";
    case "timeline":
      return "🕰️ 时间线";
    case "condition":
      return "🔑 要件";
    case "exception":
      return "⚠️ 例外";
    case "flow":
      return "🔗 流程";
    default:
      return "📝 细读";
  }
}

/** 供外部读取步骤列表（下一课按钮定位） */
export function lessonStepCount(lesson: LawLesson): number {
  return lesson.steps.length;
}
