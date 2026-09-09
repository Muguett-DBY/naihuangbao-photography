import { useEffect, useMemo, useRef, useState } from "react";
import type { LawExamAnswer, LawExamItem } from "../../../lib/law-exam";

/** 考试题型徽标（与课时自测的题型名一致） */
const RACE_LABEL: Record<string, string> = {
  order: "🧩 排序题",
  judge: "⚡ 判断题",
  mcq: "🔍 选择题",
  fill: "✏️ 填空题",
  multi: "☑️ 多选题",
};

export interface ExamRunnerProps {
  items: LawExamItem[];
  /** 交卷截止时间戳（ms）：刷新后由页面按草稿恢复，到点自动交卷 */
  deadline: number;
  /** 刷新恢复：上次的作答与题号 */
  initialAnswers?: Record<string, LawExamAnswer>;
  initialIndex?: number;
  /** 作答/翻题变化时回调（页面据此写 sessionStorage 草稿） */
  onAnswer: (answers: Record<string, LawExamAnswer>, index: number) => void;
  /** 交卷（手动确认或到时自动） */
  onSubmit: (answers: Record<string, LawExamAnswer>) => void;
  /** 放弃本场考试（清草稿回配置页） */
  onQuit: () => void;
}

function fmtClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** 题卡序列角的确定性洗牌（同一题每次渲染/刷新顺序一致，作答不靠位置记忆） */
function shuffledBank(parts: string[]): string[] {
  let seed = 0;
  for (const part of parts) for (let i = 0; i < part.length; i += 1) seed = (seed * 31 + part.charCodeAt(i)) | 0;
  const rand = (() => {
    let a = seed || 1;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  const copy = [...parts];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function ExamRunner({
  items,
  deadline,
  initialAnswers = {},
  initialIndex = 0,
  onAnswer,
  onSubmit,
  onQuit,
}: ExamRunnerProps) {
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialIndex), items.length - 1));
  const [answers, setAnswers] = useState<Record<string, LawExamAnswer>>(initialAnswers);
  const [confirming, setConfirming] = useState(false);
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));

  // 闭包保活：到点自动交卷必须拿到最新作答，不能靠 effect 依赖重建计时器
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;
  const submittedRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const left = deadline - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        clearInterval(timer);
        submitRef.current(answersRef.current);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [deadline]);

  const item = items[index];
  const answeredCount = useMemo(
    () => items.filter((entry) => answers[entry.id] !== undefined).length,
    [items, answers],
  );
  const unanswered = items.length - answeredCount;

  function commit(next: Record<string, LawExamAnswer>, nextIndex = index) {
    setAnswers(next);
    onAnswer(next, nextIndex);
  }

  function goTo(nextIndex: number) {
    const clamped = Math.min(Math.max(0, nextIndex), items.length - 1);
    setIndex(clamped);
    setConfirming(false);
    onAnswer(answersRef.current, clamped);
  }

  function setAnswer(id: string, value: LawExamAnswer) {
    commit({ ...answersRef.current, [id]: value });
  }

  function manualSubmit() {
    if (submittedRef.current) return;
    if (unanswered > 0 && !confirming) {
      setConfirming(true);
      return;
    }
    submittedRef.current = true;
    onSubmit(answersRef.current);
  }

  if (!item) return null;
  const placed = Array.isArray(answers[item.id]) ? (answers[item.id] as string[]) : [];
  const picked = typeof answers[item.id] === "string" ? (answers[item.id] as string) : "";
  const urgent = remaining < 30_000;

  return (
    <div className="law-exam__running">
      <header className="law-exam__topbar">
        <button type="button" className="law-exam__quit" onClick={onQuit}>
          ← 退出考试
        </button>
        <span
          className={`law-exam__clock ${urgent ? "is-urgent" : ""}`}
          role="timer"
          aria-label={`剩余时间 ${fmtClock(remaining)}`}
        >
          ⏳ {fmtClock(remaining)}
        </span>
        <button type="button" className="law-exam__submit" onClick={manualSubmit}>
          {confirming ? (unanswered > 0 ? `确认交卷（还有 ${unanswered} 题未答）` : "确认交卷") : "交卷"}
        </button>
      </header>

      <div
        className="law-exam__progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={answeredCount}
        aria-label={`已答 ${answeredCount} / ${items.length} 题`}
      >
        <span style={{ width: `${(answeredCount / items.length) * 100}%` }} />
      </div>
      <div className="law-exam__palette" aria-label="题号跳转">
        {items.map((entry, dot) => (
          <button
            key={entry.id}
            type="button"
            className={`law-exam__dot ${dot === index ? "is-current" : ""} ${answers[entry.id] !== undefined ? "is-done" : ""}`}
            aria-current={dot === index ? "step" : undefined}
            aria-label={`第 ${dot + 1} 题${answers[entry.id] !== undefined ? "（已答）" : ""}`}
            onClick={() => goTo(dot)}
          >
            {dot + 1}
          </button>
        ))}
      </div>

      <article className="law-quiz law-exam__card" key={item.id}>
        <header className="law-quiz__head">
          <span className="law-quiz__counter">
            第 {index + 1} / {items.length} 题
          </span>
          <span className="law-quiz__race">{RACE_LABEL[item.kind] ?? "🔍 选择题"}</span>
        </header>
        <p className="law-quiz__prompt">{item.prompt}</p>

        {item.kind === "fill" ? (
          <div className="law-quiz__fill">
            <input
              type="text"
              className="law-quiz__fill-input"
              value={picked}
              onChange={(event) => setAnswer(item.id, event.target.value)}
              placeholder="输入挖空处的词"
              aria-label="填空作答"
            />
          </div>
        ) : item.kind === "multi" && item.options ? (
          <div className="law-quiz__options">
            {item.options.map((option, optIndex) => {
              const selected = placed.includes(option);
              return (
                <button
                  key={`${optIndex}-${option}`}
                  type="button"
                  className={`law-quiz__option law-quiz__option--multi ${selected ? "is-selected" : ""}`}
                  onClick={() =>
                    setAnswer(
                      item.id,
                      selected ? placed.filter((value) => value !== option) : [...placed, option],
                    )
                  }
                  aria-pressed={selected}
                >
                  <i aria-hidden="true">{selected ? "☑" : "☐"}</i>
                  {option}
                </button>
              );
            })}
          </div>
        ) : item.kind === "order" && item.order ? (
          <div className="law-quiz__order">
            <div className="law-quiz__order-result" aria-live="polite">
              {placed.length === 0 ? (
                <span className="law-quiz__order-hint">👆 按书中的顺序依次点选（点错了可再点一下撤回，交卷前都能改）</span>
              ) : (
                placed.map((part, placedIndex) => (
                  <button
                    key={`${part}-${placedIndex}`}
                    type="button"
                    className="law-quiz__order-placed"
                    title="点一下撤回这张"
                    onClick={() =>
                      setAnswer(item.id, placed.filter((_, at) => at !== placedIndex))
                    }
                  >
                    <b>{placedIndex + 1}</b> {part}
                  </button>
                ))
              )}
            </div>
            <div className="law-quiz__order-bank">
              {shuffledBank(item.order)
                .filter((part) => !placed.includes(part))
                .map((part) => (
                  <button
                    key={part}
                    type="button"
                    className="law-quiz__order-chip"
                    onClick={() => setAnswer(item.id, [...placed, part])}
                  >
                    {part}
                  </button>
                ))}
            </div>
          </div>
        ) : (
          <div className="law-quiz__options">
            {(item.options ?? []).map((option, optIndex) => (
              <button
                key={`${optIndex}-${option}`}
                type="button"
                className={`law-quiz__option ${picked === option ? "is-selected" : ""}`}
                onClick={() => setAnswer(item.id, option)}
                aria-pressed={placed[0] === option}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </article>

      <footer className="law-exam__nav">
        <button
          type="button"
          className="law-exam__nav-btn"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
        >
          ← 上一题
        </button>
        <span className="law-exam__nav-state">
          已答 {answeredCount} / {items.length}
        </span>
        {index + 1 < items.length ? (
          <button type="button" className="law-exam__nav-btn is-primary" onClick={() => goTo(index + 1)}>
            下一题 →
          </button>
        ) : (
          <button type="button" className="law-exam__nav-btn is-primary" onClick={manualSubmit}>
            交卷，看结果 →
          </button>
        )}
      </footer>
    </div>
  );
}
