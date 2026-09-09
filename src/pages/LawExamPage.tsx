import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { LAW_SUBJECTS } from "../data/law/meta";
import { loadLawLessonView } from "../data/law/loader";
import type { LawSubjectId } from "../types/law";
import { getLawProgress } from "../lib/law-progress";
import {
  assembleExamItems,
  completedLessonsBySubject,
  examDurationSeconds,
  gradeExam,
  interleaveBySubject,
  type LawExamAnswer,
  type LawExamGrade,
  type LawExamItem,
  type LawExamLessonInput,
} from "../lib/law-exam";
import { addExamRecord, getExamRecords, type LawExamRecord } from "../lib/law-exam-storage";
import { ExamRunner } from "../components/law/exam/ExamRunner";
import { ExamResults } from "../components/law/exam/ExamResults";
import { LawLoadingSkeleton } from "../components/law/LawLoadingSkeleton";
import { LawMascot } from "../components/law/LawMascot";
import { useLawImmersive } from "../components/law/EasterEgg";
import "../styles/law-academy.css";
import "../styles/law-exam.css";

/** 题量滑块范围（配置面板与校验共用） */
const COUNT_MIN = 5;
const COUNT_MAX = 20;
const COUNT_DEFAULT = 10;

/** sessionStorage 草稿键：作答/翻题/截止时间刷新后不丢 */
const DRAFT_KEY = "nhb-law-exam-draft-v1";

interface ExamConfig {
  subjects: LawSubjectId[];
  count: number;
}

interface ExamDraft {
  config: ExamConfig;
  items: LawExamItem[];
  answers: Record<string, LawExamAnswer>;
  index: number;
  /** 交卷截止时间戳（ms）——存绝对时间，刷新后倒计时自然连续 */
  deadline: number;
}

type Phase = "config" | "loading" | "running" | "result";

function subjectOfLessonId(lessonId: string): LawSubjectId | null {
  const subject = lessonId.split("-q", 1)[0];
  return (LAW_SUBJECTS.some((entry) => entry.id === subject) ? subject : null) as LawSubjectId | null;
}

function fmtMinutes(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest > 0 ? `${minutes} 分 ${rest} 秒` : `${minutes} 分钟`;
}

function loadDraft(): ExamDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as ExamDraft;
    if (
      !draft ||
      !Array.isArray(draft.items) ||
      draft.items.length === 0 ||
      typeof draft.deadline !== "number" ||
      !draft.config ||
      !Array.isArray(draft.config.subjects) ||
      typeof draft.answers !== "object" ||
      draft.answers === null
    ) {
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function saveDraft(draft: ExamDraft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // 隐私模式等场景下草稿写不进去：考试照常进行，只是刷新后状态不恢复
  }
}

function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // 同上：清理失败不影响主流程
  }
}

export function LawExamPage() {
  useLawImmersive();
  const completed = useMemo(() => completedLessonsBySubject(getLawProgress(), LAW_SUBJECTS.map((s) => s.id)), []);
  const completedTotal = useMemo(
    () => Object.values(completed).reduce((sum, list) => sum + (list?.length ?? 0), 0),
    [completed],
  );

  const [phase, setPhase] = useState<Phase>("config");
  const [selected, setSelected] = useState<LawSubjectId[]>(() =>
    LAW_SUBJECTS.filter((subject) => (completed[subject.id]?.length ?? 0) > 0).map((subject) => subject.id),
  );
  const [count, setCount] = useState(COUNT_DEFAULT);
  const [items, setItems] = useState<LawExamItem[]>([]);
  const [grade, setGrade] = useState<LawExamGrade | null>(null);
  const [records, setRecords] = useState<LawExamRecord[]>(() => getExamRecords());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [restored, setRestored] = useState<{ answers: Record<string, LawExamAnswer>; index: number; deadline: number } | null>(
    null,
  );
  const activeConfig = useRef<ExamConfig>({ subjects: [], count: COUNT_DEFAULT });
  const draftRef = useRef<ExamDraft | null>(null);

  const finishExam = useCallback((examItems: LawExamItem[], config: ExamConfig, answers: Record<string, LawExamAnswer>) => {
    const result = gradeExam(answers, examItems);
    addExamRecord({
      at: Date.now(),
      subjects: config.subjects,
      total: result.total,
      correct: result.correct,
      bySubject: result.bySubject,
    });
    setRecords(getExamRecords());
    setGrade(result);
    setItems(examItems);
    draftRef.current = null;
    clearDraft();
    setPhase("result");
  }, []);

  // 挂载时恢复未完成的考试草稿：已过截止时间就按当前作答补交卷，否则回到考试中
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;
    draftRef.current = draft;
    activeConfig.current = draft.config;
    if (Date.now() >= draft.deadline) {
      finishExam(draft.items, draft.config, draft.answers);
    } else {
      setSelected(draft.config.subjects);
      setCount(draft.config.count);
      setItems(draft.items);
      setRestored({ answers: draft.answers, index: draft.index, deadline: draft.deadline });
      setPhase("running");
    }
  }, []);

  const persistDraft = useCallback((patch: Partial<ExamDraft>) => {
    if (!draftRef.current) return;
    draftRef.current = { ...draftRef.current, ...patch };
    saveDraft(draftRef.current);
  }, []);

  const startExam = useCallback(async () => {
    const config: ExamConfig = { subjects: selected, count };
    activeConfig.current = config;
    setLoadError(null);
    setPhase("loading");
    try {
      const ids = interleaveBySubject(completedLessonsBySubject(getLawProgress(), config.subjects)).slice(
        0,
        config.count * 2,
      );
      const inputs: LawExamLessonInput[] = [];
      // 并发拉取（loader 内部对同一文件去重缓存），单课失败跳过不拖垮整卷
      const views = await Promise.all(
        ids.map(async (lessonId) => {
          const subject = subjectOfLessonId(lessonId);
          if (!subject) return null;
          try {
            const view = await loadLawLessonView(subject, lessonId);
            return view ? ({ subject, lesson: view.lesson, siblingTerms: view.siblingTerms } as LawExamLessonInput) : null;
          } catch {
            return null;
          }
        }),
      );
      for (const input of views) if (input) inputs.push(input);
      const examItems = assembleExamItems(inputs, config.count, { seed: Date.now() });
      if (examItems.length === 0) {
        setLoadError("这些已完成的课暂时出不了题（出题宁缺毋滥），先去再学几课吧。");
        setPhase("config");
        return;
      }
      const deadline = Date.now() + examDurationSeconds(examItems.length) * 1000;
      const draft: ExamDraft = { config, items: examItems, answers: {}, index: 0, deadline };
      draftRef.current = draft;
      saveDraft(draft);
      setItems(examItems);
      setRestored(null);
      setPhase("running");
    } catch (cause: unknown) {
      setLoadError(cause instanceof Error ? cause.message : "试卷加载失败，请重试。");
      setPhase("config");
    }
  }, [selected, count]);

  const quitExam = useCallback(() => {
    draftRef.current = null;
    clearDraft();
    setRestored(null);
    setPhase("config");
  }, []);

  const toggleSubject = (subject: LawSubjectId) => {
    setSelected((prev) =>
      prev.includes(subject) ? prev.filter((entry) => entry !== subject) : [...prev, subject],
    );
  };

  // ── 空池引导态：一个已掌握的课都没有 ──
  if (phase === "config" && completedTotal === 0) {
    return (
      <div className="law-academy law-exam">
        <header className="law-exam__head">
          <Link to="/law" className="law-exam__back">← 学习中心</Link>
          <h1>🎓 模拟考试</h1>
        </header>
        <div className="law-exam__empty" aria-live="polite">
          <LawMascot mood="cheer" size={88} />
          <h2>还没有可以出题的课</h2>
          <p>
            模拟考试的题目全部来自你「已掌握」的课时。先去学习中心学完一课的自测
            （答对一半以上即掌握），回这里就能一键组卷、限时作答。
          </p>
          <Link to="/law" className="law-exam__empty-cta">去学习第一课 →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="law-academy law-exam">
      <header className="law-exam__head">
        <Link to="/law" className="law-exam__back">← 学习中心</Link>
        <h1>🎓 模拟考试</h1>
      </header>

      {phase === "config" ? (
        <section className="law-exam__panel" aria-label="考试配置">
          <h2>① 选择科目</h2>
          <div className="law-exam__subjects">
            {LAW_SUBJECTS.map((subject) => {
              const available = completed[subject.id]?.length ?? 0;
              const disabled = available === 0;
              return (
                <label
                  key={subject.id}
                  className={`law-exam__subject ${disabled ? "is-disabled" : ""} ${selected.includes(subject.id) ? "is-on" : ""}`}
                  style={{ "--law-accent": subject.accent, "--law-accent-soft": subject.accentSoft } as CSSProperties}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(subject.id)}
                    disabled={disabled}
                    onChange={() => toggleSubject(subject.id)}
                  />
                  <span className="law-exam__subject-emoji" aria-hidden="true">{subject.emoji}</span>
                  <span className="law-exam__subject-body">
                    <b>{subject.name}</b>
                    <small>{disabled ? "还没有已掌握的课" : `已掌握 ${available} 课`}</small>
                  </span>
                </label>
              );
            })}
          </div>

          <h2>② 题量</h2>
          <div className="law-exam__count">
            <input
              type="range"
              min={COUNT_MIN}
              max={COUNT_MAX}
              step={1}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              aria-label={`题量 ${count} 题`}
            />
            <b>{count} 题</b>
          </div>
          <p className="law-exam__hint">
            每题 45 秒，总时长约 {fmtMinutes(examDurationSeconds(count))}；到时自动交卷，没答的按错计。
          </p>

          {loadError ? (
            <p className="law-exam__error" role="alert">{loadError}</p>
          ) : null}

          <button
            type="button"
            className="law-exam__start"
            disabled={selected.length === 0}
            onClick={() => void startExam()}
          >
            开始考试 →
          </button>
          {selected.length === 0 ? <p className="law-exam__hint">至少勾选一个有已掌握课程的科目。</p> : null}
        </section>
      ) : null}

      {phase === "loading" ? (
        <div aria-live="polite">
          <LawLoadingSkeleton label="正在组卷，请稍候" />
        </div>
      ) : null}

      {phase === "running" && items.length > 0 ? (
        <ExamRunner
          items={items}
          deadline={restored?.deadline ?? draftRef.current?.deadline ?? Date.now() + examDurationSeconds(items.length) * 1000}
          initialAnswers={restored?.answers}
          initialIndex={restored?.index}
          onAnswer={(answers, index) => persistDraft({ answers, index })}
          onSubmit={(answers) => finishExam(items, activeConfig.current, answers)}
          onQuit={quitExam}
        />
      ) : null}
      {phase === "running" && items.length === 0 ? <LawLoadingSkeleton label="正在恢复考试" /> : null}

      {phase === "result" && grade ? (
        <ExamResults
          grade={grade}
          records={records}
          onRetry={() => {
            setPhase("config");
          }}
        />
      ) : null}
    </div>
  );
}
