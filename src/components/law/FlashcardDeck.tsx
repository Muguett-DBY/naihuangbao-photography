import { useCallback, useEffect, useRef, useState } from "react";
import type { Flashcard } from "../../lib/law-flashcard";
import { LAW_SUBJECTS } from "../../data/law/meta";

/**
 * 闪卡牌堆交互（P2·T2）：
 * - 点击/空格翻面（CSS 3D，respects prefers-reduced-motion）；← → 或滑动切上一张/下一张；
 * - 😭 不会 → 重排到队列末尾；😐 模糊 → 重排到剩余队列中部；😊 会了 → 移出队列；
 * - 队列清空后进入总结页：本轮张数 + 会了/模糊/不会，可"再来一轮"。
 */

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
    return (
      <div className="law-flash__summary" aria-live="polite">
        <p className="law-flash__summary-emoji">🎉</p>
        <h2>这一轮刷完了！</h2>
        <p className="law-flash__summary-total">
          本轮 <b>{rated}</b> 张
        </p>
        <ul className="law-flash__summary-stats">
          <li>😊 会了 <b>{rating.known}</b></li>
          <li>😐 模糊 <b>{rating.fuzzy}</b></li>
          <li>😭 不会 <b>{rating.unknown}</b></li>
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
        className={`law-flash__card ${subject ? "has-accent" : ""} ${flipped ? "is-flipped" : ""}`}
        style={subject ? ({ "--law-accent": subject.accent, "--law-accent-soft": subject.accentSoft } as React.CSSProperties) : undefined}
        aria-pressed={flipped}
        aria-label={`闪卡正面：${current.front}。${flipped ? "已翻面" : "点击或按空格键翻面看答案"}`}
        onClick={() => setFlipped((value) => !value)}
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
              {subject ? `${subject.emoji} ${subject.name}` : ""} · {current.lessonTitle}
            </span>
          </span>
        </span>
      </button>

      <div className="law-flash__rate" role="group" aria-label="给这张卡打分">
        <button type="button" className="law-flash__rate-btn is-unknown" onClick={() => rate("unknown")}>
          😭 不会
        </button>
        <button type="button" className="law-flash__rate-btn is-fuzzy" onClick={() => rate("fuzzy")}>
          😐 模糊
        </button>
        <button type="button" className="law-flash__rate-btn is-known" onClick={() => rate("known")}>
          😊 会了
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
