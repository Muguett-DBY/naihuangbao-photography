import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import type { LawQuizItem } from "../../../types/law";
import { LawMascot } from "../LawMascot";

type AnswerState = "idle" | "correct" | "wrong";

export function QuizRunner({
  items,
  accent,
  accentSoft,
  onDone,
}: {
  items: LawQuizItem[];
  accent: string;
  accentSoft: string;
  onDone: (correct: number, total: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [state, setState] = useState<AnswerState>("idle");
  const [picked, setPicked] = useState<string | null>(null);
  const [orderTry, setOrderTry] = useState<string[]>([]);

  const item = items[index];
  const race = item?.kind === "order" ? "order" : item?.kind === "judge" ? "judge" : "mcq";

  const finished = index >= items.length;

  const handleOrderComplete = useCallback(
    (isGood: boolean) => {
      setState(isGood ? "correct" : "wrong");
      if (isGood) setCorrectCount((value) => value + 1);
    },
    [],
  );

  function next() {
    if (index + 1 >= items.length) {
      onDone(correctCount, items.length);
      return;
    }
    setIndex((value) => value + 1);
    setState("idle");
    setPicked(null);
    setOrderTry([]);
  }

  function answer(option: string) {
    if (state !== "idle" || !item) return;
    const isCorrect = option === item.answer;
    setPicked(option);
    setState(isCorrect ? "correct" : "wrong");
    if (isCorrect) setCorrectCount((value) => value + 1);
  }

  if (finished || !item) {
    return (
      <div className="law-quiz__done" style={styleVars(accent, accentSoft)}>
        <LawMascot mood="cheer" size={72} />
        <p>自测结束，成绩已记录！</p>
        <button type="button" className="law-player__cta" onClick={() => onDone(correctCount, items.length)}>
          查看结果 →
        </button>
      </div>
    );
  }

  return (
    <motion.div
      className="law-quiz"
      style={styleVars(accent, accentSoft)}
      key={item.id}
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22 }}
    >
      <header className="law-quiz__head">
        <span className="law-quiz__counter">
          第 {index + 1} / {items.length} 题
        </span>
        <span className="law-quiz__race">{race === "order" ? "🧩 排序题" : race === "judge" ? "⚡ 判断题" : "🔍 选择题"}</span>
      </header>
      <p className="law-quiz__prompt">{item.prompt}</p>

      {item.kind === "order" && item.order ? (
        <OrderChoice
          order={item.order}
          onComplete={handleOrderComplete}
          onMove={(value) => setOrderTry(value)}
          tryList={orderTry}
        />
      ) : (
        <div className="law-quiz__options">
          {(item.options ?? []).map((option, optIndex) => (
            <motion.button
              key={`${optIndex}-${option}`}
              type="button"
              className={`law-quiz__option ${picked === option ? `is-${state}` : ""}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: optIndex * 0.08 }}
              onClick={() => answer(option)}
              disabled={state !== "idle"}
            >
              {option}
            </motion.button>
          ))}
        </div>
      )}

      {state !== "idle" ? (
        <div className={`law-quiz__feedback is-${state}`}>
          {state === "correct" ? "✅ 答对啦！" : "❌ 不对哦，看看解释："}
          <span>{item.explain}</span>
          <button type="button" className="law-quiz__next" onClick={next}>
            {index + 1 >= items.length ? "最后一题啦 →" : "下一题 →"}
          </button>
        </div>
      ) : null}
    </motion.div>
  );
}

function OrderChoice({
  order,
  onComplete,
  onMove,
  tryList,
}: {
  order: string[];
  onComplete: (correct: boolean) => void;
  onMove: (value: string[]) => void;
  tryList: string[];
}) {
  const available = useMemo(
    () => order.filter((part) => !tryList.includes(part)),
    [order, tryList],
  );

  useEffect(() => {
    if (tryList.length === order.length) {
      onComplete(tryList.every((part, index) => part === order[index]));
    }
  }, [tryList, order, onComplete]);

  return (
    <div className="law-quiz__order">
      <div className="law-quiz__order-result" aria-live="polite">
        {tryList.length === 0 ? (
          <span className="law-quiz__order-hint">👆 按你记忆的顺序，从下往上依次点选</span>
        ) : (
          tryList.map((part, index) => (
            <motion.span
              key={`${part}-${index}`}
              className="law-quiz__order-placed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <b>{index + 1}</b> {part}
            </motion.span>
          ))
        )}
      </div>
      <div className="law-quiz__order-bank">
        {available.map((part) => (
          <button
            key={part}
            type="button"
            className="law-quiz__order-chip"
            onClick={() => onMove([...tryList, part])}
          >
            {part}
          </button>
        ))}
      </div>
    </div>
  );
}

function styleVars(accent: string, accentSoft: string) {
  return { "--law-accent": accent, "--law-accent-soft": accentSoft } as CSSProperties;
}
