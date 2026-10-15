import { useCallback, useEffect, useRef, useState } from "react";
import type { Flashcard } from "../../lib/law-flashcard";
import { LAW_SUBJECTS } from "../../data/law/meta";
import { LawMascot, type LawMood } from "./LawMascot";

/**
 * 闪卡牌堆交互（P2·T2）：
 * - 点击/空格翻面（CSS 3D，350ms 细动效，respects prefers-reduced-motion）；← → 或滑动切上一张/下一张；
 * - 不会 → 重排到队列末尾；模糊 → 重排到剩余队列中部；会了 → 移出队列；
 * - 队列清空后进入总结页：本轮张数 + 会了/模糊/不会，可"再来一轮"。
 * - 吉祥物陪伴位（灰阶静态 ≤56px）：随翻卡/打分换表情（happy=会了、think=回忆/模糊、oops=不会），
 *   文案只说鼓励不说评判；总结页全对才动用 cheer。
 */

/** 打分 → 陪伴反应（mood→场景映射：happy=完成一步、think=回忆、oops=没记住） */
const RATE_REACTION: Record<keyof DeckRating, { mood: LawMood; line: string }> = {
  known: { mood: "happy", line: "这张稳了" },
  fuzzy: { mood: "think", line: "有点印象，下一轮再见一面" },
  unknown: { mood: "oops", line: "这次没记住，再来一遍就好" },
};

/** 学科 → 五科锚点色（CSS 变量引用，亮暗同槽变体由令牌翻转） */
const SUBJECT_ANCHOR: Record<string, string> = {
  falixue: "var(--law-a-green, #1F7A3D)",
  xianfa: "var(--law-a-indigo, #5856D6)",
  zhishixiang: "var(--law-a-bronze, #C93400)",
  minfa: "var(--law-a-teal, #0F7B83)",
  xingfa: "var(--law-a-purple, #8944AB)",
};

export interface DeckRating {
  known: number;
  fuzzy: number;
  unknown: number;
}

interface FlashcardDeckProps {
  cards: Flashcard[];
  /** 返回选择面板（总结页与复习中都可用） */
  onExit: () => void;
}

const SUBJECT_META = new Map(LAW_SUBJECTS.map((subject) => [subject.id, subject]));

const SWIPE_THRESHOLD = 48;

export function FlashcardDeck({ cards, onExit }: FlashcardDeckProps) {
  const [deck, setDeck] = useState<Flashcard[]>(cards);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [rating, setRating] = useState<DeckRating>({ known: 0, fuzzy: 0, unknown: 0 });
  const [companion, setCompanion] = useState<{ mood: LawMood; line: string }>({
    mood: "idle",
    line: "慢慢翻，不着急",
  });
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const rated = rating.known + rating.fuzzy + rating.unknown;
  const current = deck.length === 0 ? null : deck[Math.min(pos, deck.length - 1)];

  const goPrev = useCallback(() => {
    setPos((value) => Math.max(0, value - 1));
    setFlipped(false);
  }, []);
  const goNext = useCallback(() => {
    setPos((value) => Math.min(value + 1, deck.length - 1));
    setFlipped(false);
  }, [deck.length]);

  const rate = useCallback(
    (kind: keyof DeckRating) => {
      if (deck.length === 0) return;
      const index = Math.min(pos, deck.length - 1);
      const card = deck[index];
      const rest = deck.filter((_, i) => i !== index);
      if (kind === "known") {
        setDeck(rest);
      } else if (kind === "unknown") {
        setDeck([...rest, card]);
      } else {
        const at = Math.ceil(rest.length / 2);
        setDeck([...rest.slice(0, at), card, ...rest.slice(at)]);
      }
      setRating((value) => ({ ...value, [kind]: value[kind] + 1 }));
      setCompanion(RATE_REACTION[kind]);
      setFlipped(false);
      setPos((value) => Math.min(value, rest.length - 1 < 0 ? 0 : rest.length - 1));
    },
    [deck, pos],
  );

  const restart = useCallback(() => {
    setDeck(cards);
    setPos(0);
    setFlipped(false);
    setRating({ known: 0, fuzzy: 0, unknown: 0 });
    setCompanion({ mood: "idle", line: "慢慢翻，不着急" });
  }, [cards]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (deck.length === 0) return;
      const target = event.target as HTMLElement | null;
      const editable =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (editable) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === " " || event.key === "Enter") {
        // 焦点在按钮/链接上时交给元素自身响应，避免双重触发
        if (target && (target.tagName === "BUTTON" || target.tagName === "A")) return;
        event.preventDefault();
        setFlipped((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck.length, goNext, goPrev]);

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || deck.length === 0) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  if (current === null) {
    const allKnown = rated > 0 && rating.unknown === 0 && rating.fuzzy === 0;
    return (
      <div className="law-flash__summary" aria-live="polite">
        {/* 总结页吉祥物：全对才 cheer（满分里程碑），其余 happy 收尾 */}
        <span className="law-flash__summary-companion" aria-hidden="true">
          <LawMascot mood={allKnown ? "cheer" : "happy"} size={56} />
        </span>
        <h2>这一轮刷完了</h2>
        <p className="law-flash__summary-total">
          本轮 <b>{rated}</b> 张
        </p>
        <ul className="law-flash__summary-stats">
          <li>会了 <b>{rating.known}</b></li>
          <li>模糊 <b>{rating.fuzzy}</b></li>
          <li>不会 <b>{rating.unknown}</b></li>
        </ul>
        {rating.unknown + rating.fuzzy > 0 ? (
          <p className="law-flash__summary-hint">「不会/模糊」的卡下一轮会再见到——重复几次才记得牢。</p>
        ) : (
          <p className="law-flash__summary-hint">全部都会了，这一沓可以先收起来啦。</p>
        )}
        <div className="law-flash__summary-actions">
          <button type="button" className="law-flash__btn law-flash__btn--primary" onClick={restart}>
            再来一轮
          </button>
          <button type="button" className="law-flash__btn" onClick={onExit}>
            返回选择
          </button>
        </div>
      </div>
    );
  }

  const subject = current ? SUBJECT_META.get(current.subject) : undefined;
  const position = Math.min(pos, deck.length - 1) + 1;

  return (
    <div className="law-flash__deck" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="law-flash__deck-head">
        <button type="button" className="law-flash__btn law-flash__btn--small" onClick={onExit}>
          ← 退出
        </button>
        <p className="law-flash__progress" aria-live="polite">
          第 <b>{position}</b> / {deck.length} 张 · 已练 {rated} 张
        </p>
      </header>

      <button
        type="button"
        key={current.id}
        className={`law-flash__card ${flipped ? "is-flipped" : ""}`}
        style={subject ? ({ "--law-a": SUBJECT_ANCHOR[current.subject] } as React.CSSProperties) : undefined}
        aria-pressed={flipped}
        aria-label={
          flipped
            ? `闪卡背面答案：${current.back}（正面：${current.front}）。点击或按空格键翻回正面`
            : `闪卡正面：${current.front}。点击或按空格键翻面看答案`
        }
        onClick={() => {
          setFlipped((value) => !value);
          setCompanion({ mood: "think", line: "对照一下自己刚想的" });
        }}
      >
        <span className="law-flash__card-inner">
          <span className="law-flash__face law-flash__face--front" aria-hidden={flipped}>
            <span className="law-flash__face-kind">{current.kind === "lesson" ? "课时" : current.kind === "mnemonic" ? "口诀" : "术语"}</span>
            <span className="law-flash__face-text">{current.front}</span>
            <span className="law-flash__face-hint">点击 / 空格 翻面</span>
          </span>
          <span className="law-flash__face law-flash__face--back" aria-hidden={!flipped}>
            <span className="law-flash__face-text">{current.back}</span>
            <span className="law-flash__face-source">
              {subject ? subject.name : ""} · {current.lessonTitle}
            </span>
          </span>
        </span>
      </button>

      {/* 陪伴位：随打分换表情，灰阶静态吉祥物 + 一行次级灰文案（装饰不承载作答信息） */}
      <div className="law-flash__companion" aria-hidden="true">
        <LawMascot mood={companion.mood} size={44} />
        <span className="law-flash__companion-bubble">{companion.line}</span>
      </div>

      <div className="law-flash__rate" role="group" aria-label="给这张卡打分">
        <button type="button" className="law-flash__rate-btn is-unknown" onClick={() => rate("unknown")}>
          不会
        </button>
        <button type="button" className="law-flash__rate-btn is-fuzzy" onClick={() => rate("fuzzy")}>
          模糊
        </button>
        <button type="button" className="law-flash__rate-btn is-known" onClick={() => rate("known")}>
          会了
        </button>
      </div>

      <div className="law-flash__nav">
        <button type="button" className="law-flash__btn" onClick={goPrev} disabled={pos === 0}>
          ← 上一张
        </button>
        <span className="law-flash__remaining">还剩 {deck.length} 张</span>
        <button
          type="button"
          className="law-flash__btn"
          onClick={goNext}
          disabled={position >= deck.length}
        >
          下一张 →
        </button>
      </div>
    </div>
  );
}
