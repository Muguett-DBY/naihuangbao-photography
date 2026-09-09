import { Link } from "react-router";
import type { CSSProperties } from "react";
import { LAW_SUBJECT_MAP, LAW_SUBJECTS } from "../../../data/law/meta";
import type { LawExamGrade, LawExamItem, LawExamWrong } from "../../../lib/law-exam";
import type { LawExamRecord } from "../../../lib/law-exam-storage";

/** 结果页错题条目的正确答案展示串 */
function correctAnswerOf(item: LawExamItem): string {
  if (item.kind === "multi") return (item.multi ?? item.answer.split("、")).join("、");
  if (item.kind === "order") return (item.order ?? item.answer.split("→")).join(" → ");
  return item.answer;
}

function scoreMessage(percent: number): string {
  if (percent >= 85) return "优秀！这个知识点已经长在你身上了 🌟";
  if (percent >= 70) return "良好！再扫一遍错题就能更稳 💪";
  if (percent >= 60) return "及格过线，错题正是下一步的方向 📌";
  return "别灰心，把错题带回课时里再读一遍 🌱";
}

function shortDate(at: number): string {
  const date = new Date(at);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export interface ExamResultsProps {
  grade: LawExamGrade;
  /** 历次成绩（最新在前，第一条即本场） */
  records: LawExamRecord[];
  /** 再考一次：回到配置面板（保留上次的配置） */
  onRetry: () => void;
}

export function ExamResults({ grade, records, onRetry }: ExamResultsProps) {
  const percent = grade.total > 0 ? Math.round((grade.correct / grade.total) * 100) : 0;
  const subjects = LAW_SUBJECTS.filter((subject) => grade.bySubject[subject.id]);
  const trend = records.slice(0, 5);

  return (
    <div className="law-exam__result">
      <header className="law-exam__score" aria-live="polite">
        <p className="law-exam__score-kicker">🎓 考试结束</p>
        <p className="law-exam__score-num">
          <b>{grade.correct}</b> / {grade.total}
          <span>正确率 {percent}%</span>
        </p>
        <p className="law-exam__score-msg">{scoreMessage(percent)}</p>
      </header>

      {subjects.length > 0 ? (
        <section className="law-exam__by-subject" aria-label="按科目得分">
          <h2>📚 按科目得分</h2>
          <ul>
            {subjects.map((subject) => {
              const score = grade.bySubject[subject.id]!;
              const subjectPercent = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
              return (
                <li key={subject.id} style={{ "--law-accent": subject.accent } as CSSProperties}>
                  <span className="law-exam__subject-name">
                    {subject.emoji} {subject.name}
                  </span>
                  <span className="law-exam__subject-bar">
                    <span style={{ width: `${subjectPercent}%` }} />
                  </span>
                  <span className="law-exam__subject-num">
                    {score.correct}/{score.total}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {grade.wrong.length > 0 ? (
        <section className="law-exam__wrongs" aria-label="错题列表">
          <h2>❌ 错题回顾（{grade.wrong.length} 题）</h2>
          <ol>
            {grade.wrong.map((entry, index) => (
              <WrongCard key={entry.item.id} entry={entry} index={index} />
            ))}
          </ol>
        </section>
      ) : (
        <section className="law-exam__wrongs law-exam__wrongs--allclear" aria-label="错题列表">
          <p>🎉 全部答对，这一卷没有错题！</p>
        </section>
      )}

      {trend.length > 0 ? (
        <section className="law-exam__trend" aria-label="最近成绩趋势">
          <h2>📈 最近 {trend.length} 次成绩</h2>
          <ul>
            {trend.map((record, index) => {
              const recordPercent = record.total > 0 ? Math.round((record.correct / record.total) * 100) : 0;
              return (
                <li key={`${record.at}-${index}`} className={index === 0 ? "is-current" : ""}>
                  <span className="law-exam__trend-date">{shortDate(record.at)}</span>
                  <span className="law-exam__trend-bar">
                    <span style={{ width: `${recordPercent}%` }} />
                  </span>
                  <span className="law-exam__trend-num">
                    {record.correct}/{record.total}
                  </span>
                  {index === 0 ? <em>本次</em> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <footer className="law-exam__actions">
        <button type="button" className="law-exam__again" onClick={onRetry}>
          🔁 再考一次
        </button>
        <Link to="/law" className="law-exam__home">
          回学习中心
        </Link>
      </footer>
    </div>
  );
}

function WrongCard({ entry, index }: { entry: LawExamWrong; index: number }) {
  const { item, userAnswer } = entry;
  const subject = LAW_SUBJECT_MAP[item.subject];
  return (
    <li className="law-exam__wrong">
      <header>
        <b>
          {index + 1}. {subject ? `${subject.emoji} ` : ""}
          {item.lessonTitle}
        </b>
        <span className="law-exam__wrong-kind">{item.kind}</span>
      </header>
      <p className="law-exam__wrong-prompt">{item.prompt}</p>
      <p className="law-exam__wrong-answer">
        <span className="is-user">
          你的作答：{userAnswer ?? "未作答"}
        </span>
        <span className="is-truth">正确答案：{correctAnswerOf(item)}</span>
      </p>
      <p className="law-exam__wrong-explain">{item.explain}</p>
      <Link to={`/law/learn/${item.lessonId}`} className="law-exam__wrong-link">
        回看这节课 →
      </Link>
    </li>
  );
}
