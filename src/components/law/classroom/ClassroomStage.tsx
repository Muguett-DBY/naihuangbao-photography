import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LawQuizItem } from "../../../types/law";
import type { ClassroomScene, ClassroomSceneType } from "../../../lib/law-classroom";
import "../../../styles/law-classroom.css";

/**
 * ClassroomStage — 课堂舞台。
 * 按 scene.type 渲染不同布局（concept/list/compare/checklist/timeline/
 * alert/flow/mnemonic/quiz），重点术语用学科色下划线 + 半透明底高亮。
 *
 * 组合方式：舞台提供整个课堂壳（.law-classroom），ClassroomControls
 * 通过 children 放进底部插槽：
 *
 *   <ClassroomStage scene={scene} quizItems={quiz}>
 *     <ClassroomControls … />
 *   </ClassroomStage>
 *
 * 入场动画 respects prefers-reduced-motion（reduced 时直接呈现）。
 */

/** 场景类型 → 左上角类型徽标 */
const TYPE_BADGE: Record<ClassroomSceneType, { icon: string; label: string }> = {
  concept: { icon: "💡", label: "概念" },
  list: { icon: "📌", label: "要点" },
  compare: { icon: "⚖️", label: "对比" },
  checklist: { icon: "✅", label: "要件" },
  timeline: { icon: "🕒", label: "时间线" },
  alert: { icon: "⚠️", label: "注意" },
  flow: { icon: "🧭", label: "流程" },
  mnemonic: { icon: "🎵", label: "口诀" },
  quiz: { icon: "✍️", label: "随堂测" },
};

export interface ClassroomStageProps {
  scene: ClassroomScene;
  /** quiz 场景的题目（lesson.quiz 运行时由 buildQuiz 生成）；不传则只展示题目清单 */
  quizItems?: LawQuizItem[];
  /** 随堂测完成回调（答对数 / 已作答数） */
  onQuizFinish?: (correct: number, answered: number) => void;
  className?: string;
  children?: ReactNode;
}

/* ─────────────────────────── 文本工具 ─────────────────────────── */

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 缓存一次术语正则：长词优先（"犯罪构成" 不被 "犯罪" 抢断） */
function useTermMatcher(terms: string[]): RegExp | null {
  return useMemo(() => {
    const clean = terms.map((t) => t.trim()).filter((t) => t.length >= 2);
    if (clean.length === 0) return null;
    const source = [...clean].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
    return new RegExp(`(${source})`, "g");
  }, [terms]);
}

/** 把正文按术语切开，术语包上学科色高亮 mark */
function highlightTerms(text: string, matcher: RegExp | null): ReactNode[] {
  if (!matcher) return [text];
  const parts = text.split(matcher);
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="law-classroom-term">{part}</mark>
    ) : (
      part
    ),
  );
}

/** compare 场景条目："label：a ↔ b" → { label, a, b }（解析失败降级为单列） */
function parseCompareRows(items: string[]): { label: string; a: string; b: string }[] {
  return items.map((line) => {
    const sep = line.indexOf("：");
    const label = sep >= 0 ? line.slice(0, sep) : "";
    const rest = sep >= 0 ? line.slice(sep + 1) : line;
    const pair = rest.split("↔");
    return pair.length === 2
      ? { label: label || "对比", a: pair[0].trim(), b: pair[1].trim() }
      : { label: label || "对比", a: rest.trim(), b: "" };
  });
}

/** timeline 场景条目："when：what" → { when, what } */
function parseTimelineRows(items: string[]): { when: string; what: string }[] {
  return items.map((line) => {
    const sep = line.indexOf("：");
    return sep >= 0
      ? { when: line.slice(0, sep).trim(), what: line.slice(sep + 1).trim() }
      : { when: "", what: line.trim() };
  });
}

/* ─────────────────────────── 主组件 ─────────────────────────── */

export function ClassroomStage({ scene, quizItems, onQuizFinish, className = "", children }: ClassroomStageProps) {
  const reduced = useReducedMotion();
  const matcher = useTermMatcher(scene.keyTerms);
  const badge = TYPE_BADGE[scene.type];

  // 入场参数统一收口：reduced-motion 时 framer-motion 直接呈现终态
  const enter = (delayStep = 0): EnterProps => ({
    initial: reduced ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.28, delay: reduced ? 0 : delayStep * 0.07, ease: "easeOut" },
  });

  return (
    <div className={`law-classroom ${className}`.trim()}>
      <section className="law-classroom__stage" aria-label={`第 ${scene.index + 1} 场景：${scene.title}`}>
        <motion.article
          key={scene.index}
          className={`law-classroom-scene law-classroom-scene--${scene.type}`}
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <header className="law-classroom-scene__head">
            <span className="law-classroom-scene__badge">
              {badge.icon} {badge.label}
            </span>
            <span className="law-classroom-scene__no">第 {scene.index + 1} 场</span>
          </header>

          {scene.title ? <h2 className="law-classroom-scene__title">{scene.title}</h2> : null}

          {scene.type !== "quiz" ? (
            <p className="law-classroom-scene__content">{highlightTerms(scene.content, matcher)}</p>
          ) : null}

          <SceneBody
            scene={scene}
            quizItems={quizItems}
            onQuizFinish={onQuizFinish}
            matcher={matcher}
            enter={enter}
          />
        </motion.article>
      </section>
      {children}
    </div>
  );
}

/* ─────────────────────────── 各类型布局 ─────────────────────────── */

type EnterProps = {
  /** false = reduced-motion：不播入场动画，直接呈现终态 */
  initial: false | { opacity: number; y: number };
  animate: { opacity: number; y: number };
  transition: { duration: number; delay: number; ease: "easeOut" };
};

type EnterFn = (delayStep?: number) => EnterProps;

function SceneBody({
  scene,
  quizItems,
  onQuizFinish,
  matcher,
  enter,
}: {
  scene: ClassroomScene;
  quizItems?: LawQuizItem[];
  onQuizFinish?: (correct: number, answered: number) => void;
  matcher: RegExp | null;
  enter: EnterFn;
}) {
  switch (scene.type) {
    case "list":
      return <ItemListLayout items={scene.items} matcher={matcher} enter={enter} ordered className="law-classroom-list" />;
    case "flow":
      return <ItemListLayout items={scene.items} matcher={matcher} enter={enter} ordered className="law-classroom-flow" />;
    case "checklist":
      return <ChecklistLayout items={scene.items} matcher={matcher} enter={enter} />;
    case "compare":
      return <CompareLayout items={scene.items} enter={enter} />;
    case "timeline":
      return <TimelineLayout items={scene.items} enter={enter} />;
    case "alert":
      return <AlertLayout scene={scene} matcher={matcher} enter={enter} />;
    case "mnemonic":
      return <MnemonicLayout scene={scene} enter={enter} />;
    case "quiz":
      return <QuizLayout scene={scene} quizItems={quizItems} onQuizFinish={onQuizFinish} enter={enter} />;
    default:
      // concept：正文已在上方，术语高亮即可；有补充条目就并列展示
      return scene.items.length > 0 ? (
        <ItemListLayout items={scene.items} matcher={matcher} enter={enter} className="law-classroom-notes" />
      ) : null;
  }
}

/** list / flow / concept 补充条目：编号卡片逐条展开 */
function ItemListLayout({
  items,
  matcher,
  enter,
  ordered = false,
  className,
}: {
  items: string[];
  matcher: RegExp | null;
  enter: EnterFn;
  ordered?: boolean;
  className: string;
}) {
  if (items.length === 0) return null;
  return (
    <ol className={className}>
      {items.map((item, index) => (
        <motion.li key={`${index}-${item.slice(0, 12)}`} className={`${className}__item`} {...enter(index + 1)}>
          {ordered ? (
            <span className={`${className}__no`} aria-hidden="true">{index + 1}</span>
          ) : (
            <span className={`${className}__dot`} aria-hidden="true" />
          )}
          <span className={`${className}__text`}>{highlightTerms(item, matcher)}</span>
        </motion.li>
      ))}
    </ol>
  );
}

/** checklist：可点选自查的要件清单（点选仅作跟读标记，不计分） */
function ChecklistLayout({
  items,
  matcher,
  enter,
}: {
  items: string[];
  matcher: RegExp | null;
  enter: EnterFn;
}) {
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set());
  if (items.length === 0) return null;
  const toggle = (index: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };
  return (
    <ul className="law-classroom-check" aria-label="构成要件清单">
      {items.map((item, index) => {
        const done = checked.has(index);
        return (
          <motion.li key={`${index}-${item.slice(0, 12)}`} {...enter(index + 1)}>
            <button
              type="button"
              className={`law-classroom-check__item ${done ? "is-done" : ""}`}
              aria-pressed={done}
              onClick={() => toggle(index)}
            >
              <span className="law-classroom-check__box" aria-hidden="true">{done ? "✓" : ""}</span>
              <span className="law-classroom-check__text">
                第 {index + 1} 项：{highlightTerms(item, matcher)}
              </span>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}

/** compare：左右对照（A | 对比 | B），解析失败的行降级为单列宽行 */
function CompareLayout({ items, enter }: { items: string[]; enter: EnterFn }) {
  const rows = useMemo(() => parseCompareRows(items), [items]);
  if (rows.length === 0) return null;
  return (
    <div className="law-classroom-compare">
      <div className="law-classroom-compare__legend" aria-hidden="true">
        <span>甲</span>
        <span className="law-classroom-compare__vs">对比</span>
        <span>乙</span>
      </div>
      {rows.map((row, index) => (
        <motion.div key={`${index}-${row.label}`} className="law-classroom-compare__row" {...enter(index + 1)}>
          <span className="law-classroom-compare__label">{row.label}</span>
          <span className="law-classroom-compare__cell">{row.a}</span>
          <span className="law-classroom-compare__vs" aria-hidden="true">↔</span>
          <span className="law-classroom-compare__cell">{row.b}</span>
        </motion.div>
      ))}
    </div>
  );
}

/** timeline：竖向时间线（时间点 → 说明） */
function TimelineLayout({ items, enter }: { items: string[]; enter: EnterFn }) {
  const rows = useMemo(() => parseTimelineRows(items), [items]);
  if (rows.length === 0) return null;
  return (
    <ol className="law-classroom-timeline">
      {rows.map((row, index) => (
        <motion.li key={`${index}-${row.when}`} className="law-classroom-timeline__item" {...enter(index + 1)}>
          <span className="law-classroom-timeline__dot" aria-hidden="true" />
          {row.when ? <span className="law-classroom-timeline__when">{row.when}</span> : null}
          <span className="law-classroom-timeline__what">{row.what}</span>
        </motion.li>
      ))}
    </ol>
  );
}

/** alert：例外/易错警示卡 */
function AlertLayout({
  scene,
  matcher,
  enter,
}: {
  scene: ClassroomScene;
  matcher: RegExp | null;
  enter: EnterFn;
}) {
  return (
    <div className="law-classroom-alert" role="note">
      {scene.items.map((item, index) => (
        <motion.p key={`${index}-${item.slice(0, 12)}`} {...enter(index + 1)}>
          {highlightTerms(item, matcher)}
        </motion.p>
      ))}
    </div>
  );
}

/** mnemonic：记忆卡（口诀居中放大，配学科色描边） */
function MnemonicLayout({ scene, enter }: { scene: ClassroomScene; enter: EnterFn }) {
  const card = scene.items.length > 0 ? scene.items.join("\n") : scene.content;
  return (
    <motion.figure className="law-classroom-mnemonic" {...enter(1)}>
      <span className="law-classroom-mnemonic__quote" aria-hidden="true">「</span>
      <blockquote className="law-classroom-mnemonic__text">{card}</blockquote>
      <figcaption className="law-classroom-mnemonic__hint">多念两遍，考场上特别管用</figcaption>
    </motion.figure>
  );
}

/** quiz：随堂测 —— 有题目走答题界面（选择题点选判分），无题目只列考点清单 */
function QuizLayout({
  scene,
  quizItems,
  onQuizFinish,
  enter,
}: {
  scene: ClassroomScene;
  quizItems?: LawQuizItem[];
  onQuizFinish?: (correct: number, answered: number) => void;
  enter: EnterFn;
}) {
  if (!quizItems || quizItems.length === 0) {
    // 兜底：quiz 场景 items 是题目 prompt 清单
    return (
      <ol className="law-classroom-quiz__preview" aria-label="随堂测考点清单">
        {scene.items.map((prompt, index) => (
          <motion.li key={`${index}-${prompt.slice(0, 12)}`} {...enter(index + 1)}>
            {prompt}
          </motion.li>
        ))}
      </ol>
    );
  }
  return <SceneQuiz items={quizItems} onFinish={onQuizFinish} enter={enter} />;
}

/** 简版答题界面：选择题/判断题点选即判；填空/排序/多选降级为"看答案"卡（完整作答走 QuizRunner） */
function SceneQuiz({
  items,
  onFinish,
  enter,
}: {
  items: LawQuizItem[];
  onFinish?: (correct: number, answered: number) => void;
  enter: EnterFn;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ correct: 0, answered: 0 });

  const item = items[index];
  const settled = picked !== null || revealed;

  if (!item) {
    return (
      <motion.div className="law-classroom-quiz__done" {...enter(1)}>
        <p className="law-classroom-quiz__score">
          答对 {score.correct} / 作答 {score.answered}
        </p>
        <p className="law-classroom-quiz__cheer">本课讲完啦，错的地方回上一场再听一遍吧 🐱</p>
      </motion.div>
    );
  }

  function answer(option: string) {
    if (settled || !item) return;
    setPicked(option);
    setScore((prev) => ({
      correct: prev.correct + (option === item.answer ? 1 : 0),
      answered: prev.answered + 1,
    }));
  }

  function reveal() {
    if (settled || !item) return;
    setRevealed(true);
  }

  function next() {
    if (index + 1 >= items.length) {
      onFinish?.(score.correct, score.answered);
      setIndex(index + 1); // 越过末尾 → 展示成绩卡
      return;
    }
    setIndex(index + 1);
    setPicked(null);
    setRevealed(false);
  }

  const options = item.options ?? [];
  return (
    <motion.div key={item.id} className="law-classroom-quiz" {...enter(1)}>
      <header className="law-classroom-quiz__head">
        <span>第 {index + 1} / {items.length} 题</span>
      </header>
      <p className="law-classroom-quiz__prompt">{item.prompt}</p>

      {options.length > 0 ? (
        <div className="law-classroom-quiz__options">
          {options.map((option) => {
            const isPicked = picked === option;
            const state = !settled
              ? ""
              : isPicked
                ? option === item.answer ? "is-correct" : "is-wrong"
                : settled && option === item.answer ? "is-correct" : "";
            return (
              <button
                key={option}
                type="button"
                className={`law-classroom-quiz__option ${state}`}
                onClick={() => answer(option)}
                disabled={settled}
                aria-pressed={isPicked}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <button type="button" className="law-classroom-quiz__reveal-btn" onClick={reveal} disabled={settled}>
          想好了，看答案
        </button>
      )}

      {settled ? (
        <div className={`law-classroom-quiz__feedback ${picked && picked === item.answer ? "is-correct" : "is-wrong"}`} role="status">
          <b>{picked && picked === item.answer ? "✅ 答对啦" : options.length > 0 ? `❌ 正确答案：${item.answer}` : `答案：${item.answer}`}</b>
          <span>{item.explain}</span>
          <button type="button" className="law-classroom-quiz__next" onClick={next}>
            {index + 1 >= items.length ? "看成绩 →" : "下一题 →"}
          </button>
        </div>
      ) : null}
    </motion.div>
  );
}

/** 供父级把学科色透传进舞台（非必须：舞台也会继承上游的 --law-accent） */
export function classroomStyleVars(accent: string, accentSoft?: string): CSSProperties {
  return { "--law-accent": accent, ...(accentSoft ? { "--law-accent-soft": accentSoft } : {}) } as CSSProperties;
}
