import { useMemo, type CSSProperties } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { LAW_SUBJECTS } from "../data/law/meta";
import { LAW_GRAPHICS } from "../data/law/graphics";
import lawStats from "../data/law/stats.json";
import { getDueReviewLessons, getTodayGoal, subjectStats } from "../lib/law-progress";
import { LawMascot } from "../components/law/LawMascot";
import { LawEggListener, LawEggSymbol, useLawImmersive } from "../components/law/EasterEgg";
import { LawPlanCard } from "../components/law/LawPlanCard";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import "../styles/law-academy.css";
import "../styles/law-diagrams.css";

interface LawStats {
  [key: string]: { lessonCount: number; chapterTitles: string[] };
}

const stats = lawStats as LawStats;

export function LawAcademyPage() {
  useLawImmersive();
  const progress = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const subject of LAW_SUBJECTS) {
      counts[subject.id] = stats[subject.id]?.lessonCount ?? 0;
    }
    return subjectStats(counts);
  }, []);

  const today = useMemo(() => getTodayGoal(), []);
  const doneTotal = Object.values(progress).reduce((sum, p) => sum + p.done, 0);
  const totalLessons = LAW_SUBJECTS.reduce((sum, s) => sum + (stats[s.id]?.lessonCount ?? 0), 0);
  const dueIds = useMemo(() => getDueReviewLessons(), []);
  const dueSubjectId = dueIds[0]?.replace(/-q.*/, "");

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
        <div className="law-academy__today" aria-label="我的学习进度">
          <span>
            🎯 今日 <b>{today.done}/{today.target}</b> 课
          </span>
          <span>
            ⭐ 已掌握 <b>{doneTotal}</b> 个知识点
          </span>
          {dueIds.length > 0 && LAW_SUBJECTS.some((s) => s.id === dueSubjectId) ? (
            <Link
              to={`/law/${dueSubjectId}`}
              className="law-academy__review-chip"
            >
              🔁 {dueIds.length} 课错题待复习 →
            </Link>
          ) : null}
        </div>
      </header>

      <LawPlanCard />

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
          <h2>📐 图解课堂 —— 把概念"画"出来</h2>
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
            <p>每课学完有几道自测题，答对一半以上算"已掌握"；答错的题进错题本，按记忆曲线提醒你复习。</p>
          </li>
        </ol>
      </section>

      <footer className="law-academy__foot">
        <Link to="/" className="law-academy__home">
          ← 回主页
        </Link>
        <LawEggSymbol />
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
    default:
      return "📊";
  }
}
