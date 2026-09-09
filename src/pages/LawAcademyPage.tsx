import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { LAW_SUBJECTS } from "../data/law/meta";
import { LAW_GRAPHICS } from "../data/law/graphics";
import type { LawSubjectId } from "../types/law";
import lawStats from "../data/law/stats.json";
import { getPlan } from "../lib/law-plan";
import { getDueReviewLessons, getLastLessonId, getRecentUnfinishedLesson, getTodayGoal, subjectStats } from "../lib/law-progress";
import { LawMascot } from "../components/law/LawMascot";
import { LawEggListener, LawEggSymbol, useLawImmersive } from "../components/law/EasterEgg";
import { LawEggGalleryButton, LawSoundToggle } from "../components/law/EggGallery";
import { LawFinishBanner } from "../components/law/LawFinishBanner";
import { LawPlanCard } from "../components/law/LawPlanCard";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import "../styles/law-academy.css";
import "../styles/law-diagrams.css";
import "../styles/law-flow.css";
import "../styles/law-easter.css";
import "../styles/law-visual.css";

interface LawStats {
  [key: string]: { lessonCount: number; chapterTitles: string[] };
}

const stats = lawStats as LawStats;

/** 图解按科浏览的分页步长：收起时每科先亮 8 张 */
const GRAPHIC_BROWSE_PAGE = 8;

export function LawAcademyPage() {
  useLawImmersive();
  // 全部图解按科浏览：组件级筛选，不改路由（S5/T5）
  const [graphicFilter, setGraphicFilter] = useState<LawSubjectId | "all">("all");
  const [showAllGraphics, setShowAllGraphics] = useState(false);
  const progress = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const subject of LAW_SUBJECTS) {
      counts[subject.id] = stats[subject.id]?.lessonCount ?? 0;
    }
    return subjectStats(counts);
  }, []);

  const today = useMemo(() => getTodayGoal(), []);
  const plan = useMemo(() => getPlan(), []);
  const doneTotal = Object.values(progress).reduce((sum, p) => sum + p.done, 0);
  const totalLessons = LAW_SUBJECTS.reduce((sum, s) => sum + (stats[s.id]?.lessonCount ?? 0), 0);
  const dueIds = useMemo(() => getDueReviewLessons(), []);
  const dueSubjectId = dueIds[0]?.replace(/-q.*/, "");
  // 今日学习卡的唯一主行动：优先"最近到访且未完成"的课（学到一半退出的那节），
  // 其次 lastLessonId（最近走完的课），没学过就从推荐路线第一本（民法）开始
  const resumeTarget = getRecentUnfinishedLesson() ?? getLastLessonId();
  // 注意 resumeTarget 是裸课时 id，必须拼 /law/learn/ 前缀（曾直接拼成 /law/<id> 形成坏链）
  const resumeHref = resumeTarget ? `/law/learn/${resumeTarget}` : "/law/minfa";
  const resumeLabel = resumeTarget ? "继续学习" : "开始第一课";
  const todayPercent = Math.min(100, Math.round((today.done / today.target) * 100));
  // 通关横幅候选（stats 口径），组件内部会用 meta 级精确口径复核后展示
  const finishSubjects = useMemo(
    () =>
      LAW_SUBJECTS.map((subject) => ({
        id: subject.id,
        name: subject.name,
        emoji: subject.emoji,
        done: progress[subject.id]?.done ?? 0,
        total: stats[subject.id]?.lessonCount ?? 0,
      })),
    [progress],
  );
  const filteredGraphics = useMemo(
    () =>
      graphicFilter === "all"
        ? LAW_GRAPHICS
        : LAW_GRAPHICS.filter((graphic) => graphic.subject === graphicFilter),
    [graphicFilter],
  );
  const browseGraphics = showAllGraphics
    ? filteredGraphics
    : filteredGraphics.slice(0, GRAPHIC_BROWSE_PAGE);

  return (
    <div className="law-academy">
      <header className="law-academy__hero">
        <div className="law-academy__mascot" aria-hidden="true">
          <LawMascot mood="cheer" size={96} />
        </div>
        <p className="law-academy__kicker">法硕考研 · 学习中心</p>
        <h1>把五本书，一页一页讲给你听</h1>
        <p className="law-academy__lead">
          这里的每一个知识点都拆成了小小的动画：先看，再点，再背。
          不赶时间，不跳内容——五本书 931 页，全部都在。
        </p>
        <div className="law-academy__stats">
          <span>📚 5 门学科</span>
          <span>🧩 {totalLessons} 个知识点</span>
          <span>🎮 边玩边学</span>
        </div>
        <div className="law-academy__quick">
          <Link to="/law/wrongbook" className="law-academy__quick-link">📕 错题本</Link>
          <Link to="/law/stats" className="law-academy__quick-link">📊 学习统计</Link>
          <Link to="/law/provisions" className="law-academy__quick-link">📖 法条检索</Link>
        </div>
      </header>

      {dueIds.length > 0 && LAW_SUBJECTS.some((s) => s.id === dueSubjectId) ? (
        // 直达第一节到期课的复习测试，不再绕道学科页多跳一次
        <div className="law-academy__review-banner" role="status">
          <span className="law-academy__review-banner-text">
            🔁 {dueIds.length} 课错题已到复习期，最早一节现在就测：
          </span>
          <Link to={`/law/learn/${dueIds[0]}?review=1`} className="law-academy__review-banner-go">
            开始复习 →
          </Link>
          <Link to="/law/wrongbook" className="law-academy__review-banner-all">
            错题本全部
          </Link>
        </div>
      ) : null}

      <section className="law-today-card" aria-label="今日学习">
        <div className="law-today-card__ring" role="img" aria-label={`今日目标完成 ${todayPercent}%`}>
          <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
            <circle cx="36" cy="36" r="30" fill="none" strokeWidth="8" style={{ stroke: "var(--law-accent)", opacity: 0.25 }} />
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              style={{ stroke: "var(--law-accent)", transition: "stroke-dasharray 0.6s var(--ease-out)" }}
              strokeDasharray={`${(todayPercent / 100) * 188.5} 188.5`}
              transform="rotate(-90 36 36)"
            />
          </svg>
          <b>{today.done}/{today.target}</b>
        </div>
        <div className="law-today-card__body">
          <b>{today.done >= today.target ? "今日目标达成！⭐" : "今日目标：再学 1 课"}</b>
          <span>
            距 2027 考研 {plan.daysLeft} 天 · 已掌握 {doneTotal} 个知识点
            {today.done < today.target ? " · 一课大约 5 分钟" : ""}
          </span>
        </div>
        <Link to={resumeHref} className="law-today-card__cta">
          {resumeLabel} →
        </Link>
      </section>

      <LawPlanCard />

      <section className="law-academy__route" aria-label="推荐学习路线">
        <h2>🧭 推荐学习路线</h2>
        <p className="law-academy__route-lead">
          法硕的主流打法是"理解先行、背诵后置"：先啃需要长期理解的刑法与民法，再集中背诵理论法。
          按下面的顺序走，每本书都为下一本打底。
        </p>
        <ol className="law-academy__route-steps">
          <li><b>① 民法</b><span>离生活最近，先建立请求权基础思维</span></li>
          <li><b>② 刑法</b><span>总则理论深，早开始反复消化</span></li>
          <li><b>③ 法理学</b><span>学完部门法再学原理，处处能对上号</span></li>
          <li><b>④ 宪法学</b><span>与法理学的规则理论互相衔接</span></li>
          <li><b>⑤ 法制史</b><span>纯记忆型，放到考前集中背诵效率最高</span></li>
        </ol>
      </section>

      <section className="law-academy__subjects" aria-label="选择学科">
        {LAW_SUBJECTS.map((subject, index) => {
          const stat = stats[subject.id] ?? { lessonCount: 0, chapterTitles: [] };
          const prog = progress[subject.id];
          const percent =
            prog && prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
          return (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1, margin: "0px 0px 160px 0px" }}
              transition={{ delay: index * 0.08 }}
            >
              <PrefetchLink
                to={`/law/${subject.id}`}
                className="law-subject-card"
                style={{
                  "--law-accent": subject.accent,
                  "--law-accent-soft": subject.accentSoft,
                } as CSSProperties}
              >
                <span className="law-subject-card__emoji">{subject.emoji}</span>
                <span className="law-subject-card__body">
                  <strong>{subject.name}</strong>
                  <small>{subject.short}</small>
                  <span className="law-subject-card__meta">
                    {stat.lessonCount} 个知识点 · {stat.chapterTitles.length} 个章节
                  </span>
                  {prog && prog.total > 0 ? (
                    <span className="law-subject-card__progress">
                      <span className="law-subject-card__progress-bar">
                        <span style={{ width: `${percent}%` }} />
                      </span>
                      <em>{percent}%</em>
                    </span>
                  ) : null}
                </span>
                <span className="law-subject-card__go">开始学习 →</span>
              </PrefetchLink>
            </motion.div>
          );
        })}
      </section>

      <section className="law-academy__graphics" aria-label="图解精选">
        <header className="law-academy__graphics-head">
          <h2>📐 图解课堂 —— 把概念「画」出来</h2>
          <span>
            犯罪构成为什么缺一不可？行为能力分几级？千年法制思想怎么变？——先看动画建立画面，再逐句背诵。
          </span>
        </header>
        <div className="law-academy__graphics-grid">
          {LAW_GRAPHICS.slice(0, 6).map((graphic, index) => {
            const subject = LAW_SUBJECTS.find((item) => item.id === graphic.subject)!;
            return (
              <motion.div
                key={graphic.lessonId}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1, margin: "0px 0px 160px 0px" }}
                transition={{ delay: index * 0.06 }}
              >
                <PrefetchLink
                  to={`/law/graphic/${graphic.lessonId}`}
                  className="law-graphic-card law-graphic-card--featured"
                  style={{ "--law-accent": subject.accent, "--law-accent-soft": subject.accentSoft } as CSSProperties}
                >
                  <span className="law-graphic-card__kind">{graphicEmoji(graphic.kind)}</span>
                  <span className="law-graphic-card__body">
                    <small>{subject.name} · {graphic.title}</small>
                    <strong>{graphic.title}</strong>
                  </span>
                  <span className="law-graphic-card__go">看动画 →</span>
                </PrefetchLink>
              </motion.div>
            );
          })}
        </div>

        <div className="law-graphics-browse" aria-label="全部图解">
          <div className="law-graphics-browse__chips" role="tablist" aria-label="按学科筛选图解">
            <button
              type="button"
              role="tab"
              aria-selected={graphicFilter === "all"}
              className={`law-graphics-browse__chip ${graphicFilter === "all" ? "is-current" : ""}`}
              onClick={() => {
                setGraphicFilter("all");
                setShowAllGraphics(false);
              }}
            >
              全部 {LAW_GRAPHICS.length}
            </button>
            {LAW_SUBJECTS.map((subject) => (
              <button
                key={subject.id}
                type="button"
                role="tab"
                aria-selected={graphicFilter === subject.id}
                className={`law-graphics-browse__chip ${graphicFilter === subject.id ? "is-current" : ""}`}
                style={{ "--law-accent": subject.accent, "--law-accent-soft": subject.accentSoft } as CSSProperties}
                onClick={() => {
                  setGraphicFilter(subject.id);
                  setShowAllGraphics(false);
                }}
              >
                {subject.name} {LAW_GRAPHICS.filter((g) => g.subject === subject.id).length}
              </button>
            ))}
          </div>
          <div className="law-graphics-browse__grid">
            {browseGraphics.map((graphic) => {
              const subject = LAW_SUBJECTS.find((item) => item.id === graphic.subject)!;
              return (
                <PrefetchLink
                  key={graphic.lessonId}
                  to={`/law/graphic/${graphic.lessonId}`}
                  className="law-graphic-card law-graphic-card--browse"
                  style={{ "--law-accent": subject.accent, "--law-accent-soft": subject.accentSoft } as CSSProperties}
                >
                  <span className="law-graphic-card__kind">{graphicEmoji(graphic.kind)}</span>
                  <span className="law-graphic-card__body">
                    <small>{subject.name}</small>
                    <strong>{graphic.title}</strong>
                  </span>
                </PrefetchLink>
              );
            })}
          </div>
          {filteredGraphics.length > GRAPHIC_BROWSE_PAGE ? (
            <button
              type="button"
              className="law-graphics-browse__more"
              onClick={() => setShowAllGraphics((value) => !value)}
            >
              {showAllGraphics
                ? "收起"
                : `展开全部 ${filteredGraphics.length} 张图解 ↓`}
            </button>
          ) : null}
        </div>
      </section>

      <section className="law-academy__how">
        <h2>三步学习法：看懂 → 点透 → 记牢</h2>
        <ol>
          <li>
            <span className="law-how__step">①</span>
            <strong>看动画</strong>
            <p>每个知识点自动拆成小动画：定义、列举、对比、时间线、口诀……一条条来。</p>
          </li>
          <li>
            <span className="law-how__step">②</span>
            <strong>动动手</strong>
            <p>解锁关键词、逐条勾选、翻开对比、排列顺序——不点几下不算学会。</p>
          </li>
          <li>
            <span className="law-how__step">③</span>
            <strong>过自测</strong>
            <p>每课学完有几道自测题，答对一半以上算「已掌握」；答错的题进错题本，按记忆曲线提醒你复习。</p>
          </li>
        </ol>
      </section>

      <LawFinishBanner subjects={finishSubjects} />

      <footer className="law-academy__foot">
        <Link to="/" className="law-academy__home">
          ← 回主页
        </Link>
        <span className="law-academy__foot-tools">
          <LawEggSymbol />
          <LawEggGalleryButton />
          <LawSoundToggle />
        </span>
        <span>内容源自《27 法硕背诵一本通》五册 · 针对 2027 法硕考研 · 共 931 页</span>
      </footer>

      <LawEggListener doneCount={doneTotal} />
    </div>
  );
}

function graphicEmoji(kind: string): string {
  switch (kind) {
    case "assemble":
      return "🧩";
    case "flow":
      return "🔗";
    case "tree":
      return "🌳";
    case "timeline":
      return "🕰️";
    case "balance":
      return "⚖️";
    case "stairs":
      return "🪜";
    case "matrix":
      return "🧮";
    default:
      return "📊";
  }
}
