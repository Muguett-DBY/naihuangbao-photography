import { useMemo, useState } from "react";
import { Link } from "react-router";
import { LAW_SUBJECTS } from "../data/law/meta";
import type { LawSubjectId } from "../types/law";
import { loadLawLessonView } from "../data/law/loader";
import { getLawProgress } from "../lib/law-progress";
import {
  buildFlashcards,
  getDueFlashcards,
  isActiveWrongLesson,
  isFreshLesson,
  orderLessonsByPriority,
  subjectOfLessonId,
  type Flashcard,
  type FlashcardScope,
} from "../lib/law-flashcard";
import { FlashcardDeck } from "../components/law/FlashcardDeck";
import { LawMascot } from "../components/law/LawMascot";
import { useLawImmersive } from "../components/law/EasterEgg";
import "../styles/law-flash.css";

/**
 * 闪卡快速复习页（P2·T3）：选择科目与口径 → 抽取已完成课时 → 全屏刷卡。
 * 一轮最多 30 课（按复习优先级截断：到期错题课必进），避免一次抽卡上百张。
 */

const LESSON_CAP = 30;

type Phase = "setup" | "loading" | "review" | "error";

const SCOPE_OPTIONS: { value: FlashcardScope; label: string; hint: string }[] = [
  { value: "all", label: "全部已完成", hint: "所有掌握过的课都会出卡" },
  { value: "wrong", label: "仅错题课", hint: "只抽还没从错题本毕业的课" },
  { value: "fresh", label: "仅未复习", hint: "只抽跳过/没做过自测的课" },
];

export function LawFlashcardPage() {
  useLawImmersive();
  const [phase, setPhase] = useState<Phase>("setup");
  const [scope, setScope] = useState<FlashcardScope>("all");
  const [selected, setSelected] = useState<Set<LawSubjectId>>(() => new Set(LAW_SUBJECTS.map((s) => s.id)));
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [round, setRound] = useState(0);
  const [loadError, setLoadError] = useState(false);

  const now = useMemo(() => Date.now(), []);
  const progress = useMemo(() => getLawProgress(), []);

  const completedBySubject = useMemo(() => {
    const counts = new Map<LawSubjectId, number>();
    for (const [lessonId, entry] of Object.entries(progress)) {
      if (entry.completedAt === undefined) continue;
      const subject = subjectOfLessonId(lessonId);
      if (subject) counts.set(subject, (counts.get(subject) ?? 0) + 1);
    }
    return counts;
  }, [progress]);

  const completedTotal = useMemo(
    () => Object.values(progress).filter((entry) => entry.completedAt !== undefined).length,
    [progress],
  );

  const scopeCounts = useMemo(() => {
    let all = 0;
    let wrong = 0;
    let fresh = 0;
    for (const [lessonId, entry] of Object.entries(progress)) {
      if (entry.completedAt === undefined) continue;
      if (!selected.has(subjectOfLessonId(lessonId) as LawSubjectId)) continue;
      all += 1;
      if (isActiveWrongLesson(entry)) wrong += 1;
      if (isFreshLesson(entry)) fresh += 1;
    }
    return { all, wrong, fresh };
  }, [progress, selected]);

  const dueCount = useMemo(() => getDueFlashcards(progress, now).length, [progress, now]);

  const candidates = useMemo(() => {
    const ids: string[] = [];
    for (const [lessonId, entry] of Object.entries(progress)) {
      if (entry.completedAt === undefined) continue;
      const subject = subjectOfLessonId(lessonId);
      if (!subject || !selected.has(subject)) continue;
      if (scope === "wrong" && !isActiveWrongLesson(entry)) continue;
      if (scope === "fresh" && !isFreshLesson(entry)) continue;
      ids.push(lessonId);
    }
    return orderLessonsByPriority(progress, ids, now).slice(0, LESSON_CAP);
  }, [progress, selected, scope, now]);

  const toggleSubject = (subject: LawSubjectId) => {
    setSelected((value) => {
      const next = new Set(value);
      if (next.has(subject)) next.delete(subject);
      else next.add(subject);
      return next;
    });
  };

  const start = async () => {
    if (candidates.length === 0) return;
    setPhase("loading");
    setLoadError(false);
    try {
      const views = await Promise.all(
        candidates.map((lessonId) =>
          loadLawLessonView(subjectOfLessonId(lessonId) as LawSubjectId, lessonId).catch(() => null),
        ),
      );
      // 课内分层的课只含前缀步骤（其余是占位元数据）——出卡前必须拉全文，否则丢术语
      const lessons = await Promise.all(
        views
          .filter((view): view is NonNullable<typeof view> => view !== null)
          .map(async (view) => (view.restLoader ? view.restLoader().catch(() => view.lesson) : view.lesson)),
      );
      if (lessons.length === 0) {
        setLoadError(true);
        setPhase("error");
        return;
      }
      const deck = buildFlashcards(progress, lessons, undefined, scope, now);
      if (deck.length === 0) {
        setLoadError(true);
        setPhase("error");
        return;
      }
      setCards(deck);
      setRound((value) => value + 1);
      setPhase("review");
    } catch {
      setLoadError(true);
      setPhase("error");
    }
  };

  return (
    <div className="law-academy law-flash">
      <header className="law-flash__head">
        <Link to="/law" className="law-flash__back">← 学习中心</Link>
        <h1>🃏 闪卡快刷</h1>
        <p className="law-flash__lead">
          把掌握过的课拆成一张张小卡：正面是术语，背面是课本原文。通勤、排队、睡前刷一轮。
        </p>
      </header>

      {completedTotal === 0 ? (
        <div className="law-flash__empty" aria-live="polite">
          <LawMascot mood="think" size={88} />
          <h2>还没有可抽的闪卡</h2>
          <p>闪卡从「已掌握」的课里来——先学完一课（过自测），这里就会长出你的牌堆。</p>
          <Link to="/law" className="law-flash__empty-cta">去学习 →</Link>
        </div>
      ) : phase === "review" ? (
        <FlashcardDeck key={round} cards={cards} onExit={() => setPhase("setup")} />
      ) : phase === "loading" ? (
        <div className="law-flash__loading" aria-live="polite">
          <LawMascot mood="cheer" size={64} />
          <p>正在把 {candidates.length} 课内容整理成闪卡……</p>
        </div>
      ) : phase === "error" ? (
        <div className="law-flash__error" aria-live="polite">
          <p>闪卡整理失败了（{loadError ? "内容加载异常" : "没有抽到可用的卡"}），请重试。</p>
          <button type="button" className="law-flash__btn" onClick={() => setPhase("setup")}>
            ← 返回重选
          </button>
        </div>
      ) : (
        <section className="law-flash__setup" aria-label="选择复习范围">
          {dueCount > 0 ? (
            <p className="law-flash__due-hint" role="status">
              🔁 有 <b>{dueCount}</b> 课的错题/新卡已到期，会排在牌堆最前面。
            </p>
          ) : null}

          <fieldset className="law-flash__group">
            <legend>科目（已掌握 {completedTotal} 课）</legend>
            <div className="law-flash__subjects">
              {LAW_SUBJECTS.map((subject) => {
                const count = completedBySubject.get(subject.id) ?? 0;
                return (
                  <label key={subject.id} className={`law-flash__check ${selected.has(subject.id) ? "is-on" : ""} ${count === 0 ? "is-empty" : ""}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(subject.id)}
                      onChange={() => toggleSubject(subject.id)}
                      disabled={count === 0}
                    />
                    <span>{subject.emoji} {subject.name}</span>
                    <small>{count > 0 ? `${count} 课` : "未开始"}</small>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="law-flash__group">
            <legend>抽卡范围</legend>
            <div className="law-flash__scopes">
              {SCOPE_OPTIONS.map((option) => (
                <label key={option.value} className={`law-flash__scope ${scope === option.value ? "is-on" : ""}`}>
                  <input
                    type="radio"
                    name="law-flash-scope"
                    checked={scope === option.value}
                    onChange={() => setScope(option.value)}
                  />
                  <span className="law-flash__scope-label">
                    {option.label} <b>{scopeCounts[option.value]}</b>
                  </span>
                  <small>{option.hint}</small>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="law-flash__start">
            <button
              type="button"
              className="law-flash__btn law-flash__btn--primary law-flash__btn--big"
              onClick={start}
              disabled={candidates.length === 0}
            >
              {candidates.length > 0
                ? `开始复习（${candidates.length} 课 ≈ ${candidates.length * 2}-${candidates.length * 5} 张）`
                : "这个范围内没有可抽的课"}
            </button>
            <p className="law-flash__start-hint">
              一轮最多抽 {LESSON_CAP} 课，优先出到期的错题课；每张卡 5 秒左右，随时可以退出。
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
