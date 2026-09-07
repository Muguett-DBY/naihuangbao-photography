import { motion } from "framer-motion";
import type { LawLesson } from "../../../types/law";
import { LawMascot, type LawMood } from "../LawMascot";
import { CelebrateBurst } from "./lessonHelpers";

/** 总结页（E6：吉祥物 cheer 表情反馈） */
export function SummaryPhase({
  lesson,
  totalSteps,
  doneSteps,
  quizCount,
  onStartQuiz,
  onSkipQuiz,
}: {
  lesson: LawLesson;
  totalSteps: number;
  doneSteps: number;
  quizCount: number;
  onStartQuiz: () => void;
  onSkipQuiz: () => void;
}) {
  return (
    <motion.div
      className="law-player__summary"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <LawMascot mood="cheer" size={72} />
      <h2>本课学完啦！</h2>
      <p>{lesson.title}</p>
      <div className="law-player__summary-info">
        <span>📖 {totalSteps} 个知识点</span>
        <span>✅ {doneSteps} 步已确认掌握</span>
        {lesson.mnemonic ? <span>🧠 口诀：{lesson.mnemonic}</span> : null}
      </div>
      <div className="law-player__summary-actions">
        {quizCount > 0 ? (
          <>
            <button type="button" className="law-player__cta" onClick={onStartQuiz}>
              🎯 来自测一下
            </button>
            <button type="button" className="law-player__skip" onClick={onSkipQuiz}>
              跳过自测，直接标记掌握 →
            </button>
          </>
        ) : (
          <button type="button" className="law-player__cta" onClick={onSkipQuiz}>
            🎓 学完了，标记掌握
          </button>
        )}
        {quizCount === 0 ? (
          <p className="law-player__summary-tip">
            本课是长文讲述型，没有可自动出题的关键词句；直接标记掌握即可。
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}

/** 结果页（通过庆祝 / 不及格鼓励） */
export function ResultPhase({
  quizScore,
  onRestart,
  onRetryQuiz,
  onNextLesson,
  onExit,
}: {
  quizScore: { correct: number; total: number };
  onRestart: () => void;
  onRetryQuiz: () => void;
  onNextLesson?: (() => void) | null;
  onExit: () => void;
}) {
  const passed = quizScore.correct >= Math.ceil(quizScore.total / 2);
  const mood: LawMood = passed ? "cheer" : "oops";
  return (
    <motion.div
      className="law-player__result"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {passed ? <CelebrateBurst /> : null}
      <LawMascot mood={mood} size={84} />
      <h2>{passed ? "通过！掌握啦 🎉" : "还差一点，再练一次 💪"}</h2>
      <p className="law-player__result-score">
        自测 {quizScore.correct} / {quizScore.total} 题正确
      </p>
      <p className="law-player__result-tip">
        {passed
          ? "明天再看一眼关键词，就会变成长期记忆！"
          : "答错的题已进错题本，明天会提醒你复习——回去把没点透的步骤再走一遍，越慢越牢。"}
      </p>
      <div className="law-player__result-actions">
        <button type="button" className="law-player__cta" onClick={onRestart}>
          🔄 再学一遍
        </button>
        {!passed ? (
          <button type="button" className="law-player__cta is-alternate" onClick={onRetryQuiz}>
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
  );
}
