import { useMemo, type CSSProperties } from "react";
import { Link } from "react-router";
import { LAW_SUBJECTS } from "../data/law/meta";
import lawStats from "../data/law/stats.json";
import { getLawProgress, getStreakDays, subjectStats } from "../lib/law-progress";
import {
  countStudyDays,
  dailyActivity,
  formatDayLabel,
} from "../components/law/stats/dailyActivity";
import { wrongTotalOf, groupWrongLessons } from "../components/law/wrongbook/wrongbookGroups";
import { LawMascot } from "../components/law/LawMascot";
import { useLawImmersive } from "../components/law/EasterEgg";
import "../styles/law-academy.css";
import "../styles/law-flow.css";

interface LawStatsShape {
  [key: string]: { lessonCount: number };
}

const stats = lawStats as LawStatsShape;

/** 近 30 天柱状图（纯 SVG，无图表库） */
function ActivityChart({ series }: { series: ReturnType<typeof dailyActivity> }) {
  const max = Math.max(1, ...series.map((day) => day.lessons));
  const totalLessons = series.reduce((sum, day) => sum + day.lessons, 0);
  const totalSteps = series.reduce((sum, day) => sum + day.steps, 0);
  const barWidth = 8;
  const gap = 2.4;
  const chartHeight = 88;
  const width = series.length * (barWidth + gap);

  return (
    <div className="law-stats__chart">
      <svg
        viewBox={`0 0 ${width} ${chartHeight + 4}`}
        role="img"
        aria-label={`近 30 天学习柱状图：共完成 ${totalLessons} 课时、约 ${totalSteps} 步，单日最多 ${max} 课时`}
        preserveAspectRatio="none"
      >
        {series.map((day, index) => {
          const barHeight = day.lessons === 0 ? 1.5 : Math.max(4, (day.lessons / max) * chartHeight);
          const isToday = index === series.length - 1;
          return (
            <rect
              key={day.dayStart}
              x={index * (barWidth + gap)}
              y={chartHeight - barHeight}
              width={barWidth}
              height={barHeight}
              rx={2}
              className={`law-stats__bar ${isToday ? "is-today" : ""} ${day.lessons === 0 ? "is-zero" : ""}`}
            >
              <title>{`${formatDayLabel(day.dayStart)}：完成 ${day.lessons} 课时 · ${day.steps} 步`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="law-stats__chart-axis" aria-hidden="true">
        <span>{formatDayLabel(series[0].dayStart)}</span>
        <span>{formatDayLabel(series[Math.floor(series.length / 2)].dayStart)}</span>
        <span>今天</span>
      </div>
      {totalLessons === 0 ? (
        <p className="law-stats__chart-empty">最近 30 天还没有完成过课时——今天的柱子等你来点亮。</p>
      ) : (
        <p className="law-stats__chart-summary">
          近 30 天完成 <b>{totalLessons}</b> 课时 · 约 <b>{totalSteps}</b> 步 · 单日最多 <b>{max}</b> 课时
        </p>
      )}
    </div>
  );
}

export function LawStatsPage() {
  useLawImmersive();
  const now = useMemo(() => Date.now(), []);
  const progress = useMemo(() => getLawProgress(), []);
  const activity = useMemo(() => dailyActivity(progress, 30, now), [progress, now]);
  const studyDays = useMemo(() => countStudyDays(progress), [progress]);
  const streak = useMemo(() => getStreakDays(), []);
  const wrongGroups = useMemo(() => groupWrongLessons(progress, now), [progress, now]);
  const wrongActive = wrongTotalOf(wrongGroups);
  const doneTotal = useMemo(
    () => Object.values(progress).filter((p) => p.completedAt).length,
    [progress],
  );
  const perSubject = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const subject of LAW_SUBJECTS) counts[subject.id] = stats[subject.id]?.lessonCount ?? 0;
    return subjectStats(counts);
  }, []);
  const started = Object.keys(progress).length > 0;

  return (
    <div className="law-academy law-stats">
      <header className="law-stats__head">
        <Link to="/law" className="law-stats__back">← 学习中心</Link>
        <h1>📊 学习统计</h1>
        <p className="law-stats__lead">数据只存在你自己的浏览器里，随时回来看看脚步。</p>
      </header>

      {!started ? (
        <div className="law-stats__empty" aria-live="polite">
          <LawMascot mood="think" size={88} />
          <h2>还没有可统计的学习记录</h2>
          <p>先去学第一课，这里就会长出你的进度条、柱状图和连续天数。</p>
          <Link to="/law" className="law-stats__empty-cta">从学习中心开始 →</Link>
        </div>
      ) : (
        <>
          <section className="law-stats__cards" aria-label="总览">
            <div className="law-stats__kpi">
              <b>{doneTotal}</b>
              <span>已掌握课时</span>
            </div>
            <div className="law-stats__kpi">
              <b>{studyDays}</b>
              <span>累计学习天数</span>
            </div>
            <div className="law-stats__kpi">
              <b>{streak} 天{streak >= 3 ? " 🔥" : ""}</b>
              <span>当前连续</span>
            </div>
            <div className={`law-stats__kpi ${wrongActive > 0 ? "is-warn" : "is-ok"}`}>
              <b>{wrongActive === 0 ? "0" : `${wrongGroups.dueToday.length}/${wrongActive}`}</b>
              <span>错题健康度（今日到期/未毕业）</span>
            </div>
          </section>

          <section className="law-stats__section" aria-label="近 30 天学习节奏">
            <h2>近 30 天学习节奏</h2>
            <ActivityChart series={activity} />
          </section>

          <section className="law-stats__section" aria-label="五科进度">
            <h2>五科进度</h2>
            <ul className="law-stats__subjects">
              {LAW_SUBJECTS.map((subject) => {
                const prog = perSubject[subject.id];
                const total = stats[subject.id]?.lessonCount ?? 0;
                const done = prog?.done ?? 0;
                const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <li key={subject.id} style={{ "--law-accent": subject.accent } as CSSProperties}>
                    <Link to={`/law/${subject.id}`} className="law-stats__subject">
                      <span className="law-stats__subject-name">{subject.emoji} {subject.name}</span>
                      <span className="law-stats__subject-bar">
                        <span style={{ width: `${percent}%` }} />
                      </span>
                      <span className="law-stats__subject-num">
                        {done}/{total} · {percent}%
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="law-stats__section" aria-label="错题健康度">
            <h2>错题健康度</h2>
            {wrongActive === 0 ? (
              <p className="law-stats__wrong-ok">错题本干净：没有未毕业的错题。继续保持，答错也别慌——错题会按记忆曲线帮你安排复习。</p>
            ) : (
              <div className="law-stats__wrong">
                <p>
                  未毕业错题 <b>{wrongActive}</b> 课，其中 <b>{wrongGroups.dueToday.length}</b> 课今天到期。
                  {wrongGroups.graduated.length > 0
                    ? ` 另有 ${wrongGroups.graduated.length} 课已五轮全对毕业。`
                    : ""}
                </p>
                <Link to="/law/wrongbook" className="law-stats__wrong-cta">
                  {wrongGroups.dueToday.length > 0 ? "去复习 →" : "查看错题本 →"}
                </Link>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
