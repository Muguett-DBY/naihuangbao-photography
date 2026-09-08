import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import type { LawQuizItem } from "../../../types/law";
import { fillMatches } from "../../../lib/law-quiz-fill";
import type { QuizWrongDetail } from "../../../lib/law-wrong-tags";
import { playLawSound } from "../../../lib/law-sound";
import { LawMascot } from "../LawMascot";

type AnswerState = "idle" | "correct" | "wrong";

const RACE_LABEL: Record<string, string> = {
  order: "🧩 排序题",
  judge: "⚡ 判断题",
  mcq: "🔍 选择题",
  fill: "✏️ 填空题",
  multi: "☑️ 多选题",
};

export function QuizRunner({
  items,
  accent,
  accentSoft,
  onDone,
}: {
  items: LawQuizItem[];
  accent: string;
  accentSoft: string;
  onDone: (correct: number, total: number, wrong: number, wrongDetails?: QuizWrongDetail[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [state, setState] = useState<AnswerState>("idle");
  const [picked, setPicked] = useState<string | null>(null);
  const [orderTry, setOrderTry] = useState<string[]>([]);
  const [fillInput, setFillInput] = useState("");
  const [multiPicked, setMultiPicked] = useState<string[]>([]);
  // 错题明细（题型+陷阱+所选项）：ref 避免收卷闭包读到旧值
  const wrongDetailsRef = useRef<QuizWrongDetail[]>([]);

  const item = items[index];
  const race = item ? RACE_LABEL[item.kind] ?? "🔍 选择题" : "mcq";

  const finished = index >= items.length;

  const settle = useCallback(
    (isCorrect: boolean, detail?: QuizWrongDetail) => {
      setState(isCorrect ? "correct" : "wrong");
      playLawSound(isCorrect ? "correct" : "wrong");
      if (isCorrect) setCorrectCount((value) => value + 1);
      else {
        setWrongCount((value) => value + 1);
        if (detail) wrongDetailsRef.current.push(detail);
      }
    },
    [],
  );

  const handleOrderComplete = useCallback(
    (isGood: boolean) => {
      settle(isGood, { kind: "order", answer: item?.answer });
    },
    [settle, item],
  );

  function next() {
    if (index + 1 >= items.length) {
      onDone(correctCount, items.length, wrongCount, wrongDetailsRef.current);
      return;
    }
    setIndex((value) => value + 1);
    setState("idle");
    setPicked(null);
    setOrderTry([]);
    setFillInput("");
    setMultiPicked([]);
  }

  function answer(option: string) {
    if (state !== "idle" || !item) return;
    const isCorrect = option === item.answer;
    setPicked(option);
    settle(isCorrect, {
      kind: item.kind,
      trap: item.trap,
      picked: option,
      answer: item.answer,
    });
  }

  function submitFill() {
    if (state !== "idle" || !item || fillInput.trim().length === 0) return;
    const isCorrect = fillMatches(fillInput, item.answer);
    settle(isCorrect, { kind: "fill", picked: fillInput.trim(), answer: item.answer });
  }

  function toggleMulti(option: string) {
    if (state !== "idle") return;
    setMultiPicked((prev) => (prev.includes(option) ? prev.filter((v) => v !== option) : [...prev, option]));
  }

  function confirmMulti() {
    if (state !== "idle" || !item) return;
    const correct = item.multi ?? item.answer.split("、");
    const isCorrect =
      multiPicked.length === correct.length && multiPicked.every((option) => correct.includes(option));
    // 多选打标口径：漏选=条件遗漏由 kind 推导；这里带上所选项供聚合分析
    settle(isCorrect, { kind: "multi", picked: multiPicked.join("、"), answer: item.answer });
  }

  if (finished || !item) {
    return (
      <div className="law-quiz__done" style={styleVars(accent, accentSoft)}>
        <LawMascot mood="cheer" size={72} />
        <p>自测结束，成绩已记录！</p>
        <button type="button" className="law-player__cta" onClick={() => onDone(correctCount, items.length, wrongCount, wrongDetailsRef.current)}>
          查看结果 →
        </button>
      </div>
    );
  }

  // 答错时的答案揭示行（fill/multi 不像 mcq 有选项高亮可看）
  const reveal =
    state === "wrong" && item.kind === "fill"
      ? `正确答案：${item.answer}`
      : state === "wrong" && item.kind === "multi"
        ? `正确选项：${(item.multi ?? []).join("、")}`
        : null;

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
        <span className="law-quiz__race">{race}</span>
      </header>
      <p className="law-quiz__prompt">{item.prompt}</p>

      {item.kind === "order" && item.order ? (
        <OrderChoice
          order={item.order}
          onComplete={handleOrderComplete}
          onMove={(value) => setOrderTry(value)}
          tryList={orderTry}
          locked={state !== "idle"}
        />
      ) : item.kind === "fill" ? (
        <div className="law-quiz__fill">
          <input
            type="text"
            className="law-quiz__fill-input"
            value={fillInput}
            onChange={(event) => setFillInput(event.target.value)}
            onKeyDown={(event) => {
              // 中文输入法组合期的 Enter 是"上屏候选"，不是提交（否则拼音串会立即判错锁死）
              if (event.key === "Enter" && !event.nativeEvent.isComposing) submitFill();
            }}
            placeholder="输入挖空处的词"
            aria-label="填空作答"
            disabled={state !== "idle"}
          />
          <button
            type="button"
            className="law-quiz__fill-submit"
            onClick={submitFill}
            disabled={state !== "idle" || fillInput.trim().length === 0}
          >
            提交
          </button>
        </div>
      ) : item.kind === "multi" && item.options ? (
        <MultiChoice
          options={item.options}
          correct={item.multi ?? item.answer.split("、")}
          pickedList={multiPicked}
          locked={state !== "idle"}
          onToggle={toggleMulti}
          onConfirm={confirmMulti}
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
        <div className={`law-quiz__feedback is-${state}`} role="status">
          {/* role=status：答题结果（对错+解释）出现时读屏即时播报，与排序题结果区一致 */}
          {state === "correct" ? "✅ 答对啦！" : "❌ 不对哦，看看解释："}
          {reveal ? <b className="law-quiz__reveal">{reveal}</b> : null}
          <span>{item.explain}</span>
          <button type="button" className="law-quiz__next" onClick={next}>
            {index + 1 >= items.length ? "最后一题啦 →" : "下一题 →"}
          </button>
        </div>
      ) : null}
    </motion.div>
  );
}

/** 多选题：逐项勾选 + 确认按钮；全对才对，判分后锁定并高亮正确项/误选项 */
function MultiChoice({
  options,
  correct,
  pickedList,
  locked,
  onToggle,
  onConfirm,
}: {
  options: string[];
  correct: string[];
  pickedList: string[];
  locked: boolean;
  onToggle: (option: string) => void;
  onConfirm: () => void;
}) {
  const correctSet = useMemo(() => new Set(correct), [correct]);
  return (
    <div className="law-quiz__multi">
      <div className="law-quiz__options">
        {options.map((option, optIndex) => {
          const isSelected = pickedList.includes(option);
          const cls = locked
            ? correctSet.has(option)
              ? "is-correct"
              : isSelected
                ? "is-wrong"
                : ""
            : isSelected
              ? "is-selected"
              : "";
          return (
            <motion.button
              key={`${optIndex}-${option}`}
              type="button"
              className={`law-quiz__option law-quiz__option--multi ${cls}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: optIndex * 0.05 }}
              onClick={() => onToggle(option)}
              disabled={locked}
              aria-pressed={isSelected}
            >
              <i aria-hidden="true">{isSelected ? "☑" : "☐"}</i>
              {option}
            </motion.button>
          );
        })}
      </div>
      <button
        type="button"
        className="law-quiz__multi-confirm"
        onClick={onConfirm}
        disabled={locked || pickedList.length === 0}
      >
        选好了，确认（{pickedList.length} 项）
      </button>
    </div>
  );
}

function OrderChoice({
  order,
  onComplete,
  onMove,
  tryList,
  locked = false,
}: {
  order: string[];
  onComplete: (correct: boolean) => void;
  onMove: (value: string[]) => void;
  tryList: string[];
  /** 判定完成后锁定：撤销只在你作答过程中可用，防止判分后改答案重复计分 */
  locked?: boolean;
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
          <span className="law-quiz__order-hint">👆 按书中的顺序，依次点选下面的卡片（点错了可再点一下撤回）</span>
        ) : (
          tryList.map((part, index) => (
            <motion.button
              key={`${part}-${index}`}
              type="button"
              className="law-quiz__order-placed"
              title={locked ? undefined : "点一下撤回这张"}
              disabled={locked}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => onMove(tryList.filter((_, placed) => placed !== index))}
            >
              <b>{index + 1}</b> {part}
            </motion.button>
          ))
        )}
      </div>
      <div className="law-quiz__order-bank">
        {available.map((part) => (
          <button
            key={part}
            type="button"
            className="law-quiz__order-chip"
            disabled={locked}
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
