import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import type { LawSubjectId } from "../types/law";
import { LAW_SUBJECT_MAP } from "../data/law/meta";
import { loadLawDirectory, type LawLessonDirectoryEntry } from "../data/law/loader";
import { getLawProgress } from "../lib/law-progress";
import {
  describeDue,
  describeStage,
  groupWrongLessons,
  wrongTotalOf,
  type WrongItem,
} from "../components/law/wrongbook/wrongbookGroups";
import { LawMascot } from "../components/law/LawMascot";
import { topWrongTags } from "../lib/law-wrong-tags";
import { strengthLabel } from "../lib/law-review";
import { LawEggListener, useLawImmersive } from "../components/law/EasterEgg";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import "../styles/law-academy.css";
import "../styles/law-flow.css";

/** 从课时 id 反推学科（目录缺失时的兜底展示也用它上色） */
function subjectOfLesson(lessonId: string): LawSubjectId | null {
  const subject = lessonId.split("-q", 1)[0] as LawSubjectId;
  return subject in LAW_SUBJECT_MAP ? subject : null;
}

export function LawWrongbookPage() {
  useLawImmersive();
  const now = useMemo(() => Date.now(), []);
  const groups = useMemo(() => groupWrongLessons(getLawProgress(), now), [now]);
  const total = wrongTotalOf(groups);

  const [directory, setDirectory] = useState<Record<string, LawLessonDirectoryEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subjects = useMemo(() => {
    const ids = new Set<LawSubjectId>();
    for (const item of [...groups.dueToday, ...groups.upcoming, ...groups.graduated]) {
      const subject = subjectOfLesson(item.lessonId);
      if (subject) ids.add(subject);
    }
    return [...ids];
  }, [groups]);

  useEffect(() => {
    if (subjects.length === 0) return;
    let cancelled = false;
    loadLawDirectory(subjects)
      .then((map) => {
        if (!cancelled) setDirectory(map);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [subjects]);

  if (total === 0) {
    return (
      <div className="law-academy law-wrongbook">
        <header className="law-wrongbook__head">
          <Link to="/law" className="law-wrongbook__back">← 学习中心</Link>
          <h1>📕 我的错题本</h1>
        </header>
        <div className="law-wrongbook__empty" aria-live="polite">
          <LawMascot mood="cheer" size={88} />
          <h2>还是空白的，继续保持！</h2>
          <p>
            自测答错的课会自动收进这里，按记忆曲线（1~15 天，按你的掌握度自适应伸缩）提醒你复习，
            连续 5 次通过就"毕业"移出。现在去学新课吧。
          </p>
          <Link to="/law" className="law-wrongbook__empty-cta">去学习 →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="law-academy law-wrongbook">
      <header className="law-wrongbook__head">
        <Link to="/law" className="law-wrongbook__back">← 学习中心</Link>
        <h1>📕 我的错题本</h1>
        <p className="law-wrongbook__lead">
          五科错题都在这：到期的先测，没到期的按记忆曲线排队，五轮全过就毕业。
        </p>
        <div className="law-wrongbook__summary">
          <span className="law-wrongbook__chip is-due">今天到期 {groups.dueToday.length}</span>
          <span className="law-wrongbook__chip">未来到期 {groups.upcoming.length}</span>
          <span className="law-wrongbook__chip is-done">已毕业 {groups.graduated.length}</span>
        </div>
      </header>

      {error ? (
        <p className="law-wrongbook__error" role="alert">
          课名目录加载失败（{error}）——不影响复习，下面用课时编号展示。
        </p>
      ) : null}
      {!directory && !error ? (
        <p className="law-wrongbook__loading" aria-live="polite">正在翻错题本……</p>
      ) : null}

      <WrongGroup
        title="🔴 今天到期 · 先测这些"
        hint="记忆刚好到遗忘边缘，现在复习性价比最高"
        items={groups.dueToday}
        directory={directory}
        now={now}
      />
      <WrongGroup
        title="🟡 未来到期 · 排队中"
        hint="还不到复习时间，提前翻看也可以，但别急着测"
        items={groups.upcoming}
        directory={directory}
        now={now}
      />
      <WrongGroup
        title="🟢 已毕业 · 战绩存档"
        hint="这些题曾经错过，如今五轮全对——考前可以回来扫一眼"
        items={groups.graduated}
        directory={directory}
        now={now}
      />

      <LawEggListener />
    </div>
  );
}

function WrongGroup({
  title,
  hint,
  items,
  directory,
  now,
}: {
  title: string;
  hint: string;
  items: WrongItem[];
  directory: Record<string, LawLessonDirectoryEntry> | null;
  now: number;
}) {
  if (items.length === 0) return null;
  return (
    <section className="law-wrongbook__group" aria-label={title}>
      <header>
        <h2>{title}</h2>
        <span>{hint}</span>
      </header>
      <ul>
        {items.map((item) => (
          <WrongRow key={item.lessonId} item={item} entry={directory?.[item.lessonId]} now={now} />
        ))}
      </ul>
    </section>
  );
}

function WrongRow({ item, entry, now }: { item: WrongItem; entry?: LawLessonDirectoryEntry; now: number }) {
  const subjectId = entry?.subject ?? subjectOfLesson(item.lessonId);
  const subject = subjectId ? LAW_SUBJECT_MAP[subjectId] : null;
  const title = entry?.title ?? item.lessonId;
  const due = item.reviewDueAt !== undefined && item.reviewDueAt <= now;
  const href = due ? `/law/learn/${item.lessonId}?review=1` : `/law/learn/${item.lessonId}`;
  const stage = describeStage(item);
  const tags = topWrongTags(item.wrongTags);

  return (
    <li>
      <PrefetchLink
        to={href}
        className={`law-wrongbook__item ${due ? "is-due" : ""} ${item.reviewDueAt === undefined ? "is-graduated" : ""}`}
      >
        {subject ? (
          <span className="law-wrongbook__subject" style={{ "--law-accent": subject.accent } as CSSProperties}>
            {subject.emoji} {subject.name}
          </span>
        ) : null}
        <span className="law-wrongbook__body">
          <b>{title}</b>
          <small>
            {entry?.chapterTitle ? `${entry.chapterTitle} · ` : ""}错 {item.wrongCount} 次
            {stage ? ` · ${stage}` : ""}
            <span
              className="law-wrongbook__strength"
              title={`记忆强度：${strengthLabel(item.strength)}（正确率越高星越多，毕业满分）`}
              aria-label={`记忆强度${item.strength}星`}
            >
              {strengthLabel(item.strength)}
            </span>
          </small>
          {tags.length > 0 ? (
            <small className="law-wrongbook__tags">
              {tags.map((tag) => (
                <span key={tag} className="law-wrongbook__tag">
                  🏷️ {tag} ×{item.wrongTags?.[tag]}
                </span>
              ))}
            </small>
          ) : null}
        </span>
        <span className={`law-wrongbook__due ${due ? "is-due" : ""}`}>
          {describeDue(item, now)}
        </span>
        <span className="law-wrongbook__go">{due ? "开始复习 →" : item.reviewDueAt === undefined ? "回顾 →" : "去学习 →"}</span>
      </PrefetchLink>
    </li>
  );
}
