import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router";
import { LAW_SUBJECTS, LAW_SUBJECT_MAP } from "../data/law/meta";
import type { LawSubjectId, LawSubjectMeta } from "../types/law";
import { loadLawDirectory, type LawLessonDirectoryEntry } from "../data/law/loader";
import {
  exportAllNotes,
  getAllNotes,
  importNotes,
  LAW_NOTES_EVENT,
  LAW_NOTES_STORAGE_KEY,
  searchNotes,
  type LawNote,
} from "../lib/law-notes";
import { LawMascot } from "../components/law/LawMascot";
import { LawEggListener, useLawImmersive } from "../components/law/EasterEgg";
import { PrefetchLink } from "../components/shared/PrefetchLink";
import "../styles/law-academy.css";
import "../styles/law-notes.css";

/** 从课时 id 反推学科（lessonId 形如 minfa-q012） */
function subjectOfLesson(lessonId: string): LawSubjectMeta | null {
  const subject = lessonId.split("-q", 1)[0];
  return subject in LAW_SUBJECT_MAP ? LAW_SUBJECT_MAP[subject as keyof typeof LAW_SUBJECT_MAP] : null;
}

interface NoteRow extends LawNote {
  lessonId: string;
  /** 搜索命中时的摘要（无搜索时为空 = 展示全文） */
  excerpt?: string;
}

interface LessonGroup {
  lessonId: string;
  title: string;
  chapterTitle: string;
  notes: NoteRow[];
}

interface SubjectGroup {
  subject: LawSubjectMeta | null;
  lessons: LessonGroup[];
}

/** 关键词高亮：按命中位置切段，<mark> 包住命中词（React 节点转义，无 XSS 面） */
function Highlighted({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLowerCase();
  if (!needle) return <>{text}</>;
  const segments: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  let index = text.toLowerCase().indexOf(needle);
  while (index !== -1) {
    if (index > cursor) segments.push(text.slice(cursor, index));
    segments.push(<mark key={key++}>{text.slice(index, index + needle.length)}</mark>);
    cursor = index + needle.length;
    index = text.toLowerCase().indexOf(needle, cursor);
  }
  segments.push(text.slice(cursor));
  return <>{segments}</>;
}

const SEARCH_DEBOUNCE = 300;

export function LawNotesPage() {
  useLawImmersive();
  const [notes, setNotes] = useState<NoteRow[]>(() => getAllNotes());
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [directory, setDirectory] = useState<Record<string, LawLessonDirectoryEntry> | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  // 课时内写笔记/导入导致的数据变化即时反映（LAW_NOTES_EVENT 广播）；
  // 其他标签页的写入走 storage 事件（开着总览页在另一 tab 学课的场景）
  useEffect(() => {
    const refresh = () => setNotes(getAllNotes());
    document.addEventListener(LAW_NOTES_EVENT, refresh);
    const crossTab = (event: StorageEvent) => {
      if (event.key === LAW_NOTES_STORAGE_KEY || event.key === null) refresh();
    };
    window.addEventListener("storage", crossTab);
    return () => {
      document.removeEventListener(LAW_NOTES_EVENT, refresh);
      window.removeEventListener("storage", crossTab);
    };
  }, []);

  // 搜索防抖 300ms
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(keyword), SEARCH_DEBOUNCE);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  // 真正生效的过滤（query 才参与渲染，keyword 只喂输入框）
  const filtered: NoteRow[] = useMemo(() => {
    const needle = query.trim();
    if (!needle) return notes;
    return searchNotes(needle).map((match) => ({ ...match.note, lessonId: match.lessonId, excerpt: match.excerpt }));
  }, [notes, query]);

  // 目录只拉出现过的学科（轻量 meta，不拉正文）
  const subjectIds = useMemo(() => {
    const ids = new Set<LawSubjectMeta["id"]>();
    for (const note of filtered) {
      const subject = subjectOfLesson(note.lessonId);
      if (subject) ids.add(subject.id);
    }
    return [...ids];
  }, [filtered]);
  const subjectsKey = subjectIds.join(",");

  useEffect(() => {
    if (subjectIds.length === 0) return;
    let cancelled = false;
    loadLawDirectory(subjectIds)
      .then((map) => {
        if (!cancelled) setDirectory(map);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setDirectoryError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      cancelled = true;
    };
    // subjectsKey（字符串）才是稳定依赖：搜索时 identity 变化不该重拉目录
  }, [subjectsKey]);

  // 分组：学科 → 课时 → 时间（updatedAt 倒序；getAllNotes/searchNotes 已排好）
  const groups: SubjectGroup[] = useMemo(() => {
    const bySubject = new Map<string, SubjectGroup>();
    for (const note of filtered) {
      const subject = subjectOfLesson(note.lessonId);
      const subjectKey = subject?.id ?? "other";
      let group = bySubject.get(subjectKey);
      if (!group) {
        group = { subject, lessons: [] };
        bySubject.set(subjectKey, group);
      }
      let lesson = group.lessons.find((item) => item.lessonId === note.lessonId);
      if (!lesson) {
        const entry = directory?.[note.lessonId];
        lesson = {
          lessonId: note.lessonId,
          title: entry?.title ?? note.lessonId,
          chapterTitle: entry?.chapterTitle ?? "",
          notes: [],
        };
        group.lessons.push(lesson);
      }
      lesson.notes.push(note);
    }
    const ordered: SubjectGroup[] = [];
    for (const subject of LAW_SUBJECTS) {
      const group = bySubject.get(subject.id);
      if (group) {
        group.lessons.sort((a, b) => {
          const latestA = a.notes[0]?.updatedAt ?? 0;
          const latestB = b.notes[0]?.updatedAt ?? 0;
          return latestB - latestA;
        });
        ordered.push(group);
      }
    }
    const other = bySubject.get("other");
    if (other) ordered.push(other);
    return ordered;
  }, [filtered, directory]);

  const hasNotes = notes.length > 0;
  const searching = query.trim().length > 0;

  function showImportFeedback(message: string) {
    setImportFeedback(message);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setImportFeedback(null), 4000);
  }

  async function handleImportFile(file: File | undefined) {
    if (!file) return;
    const result = await importNotes(file);
    showImportFeedback(result.imported > 0 ? `导入完成：${result.imported} 条笔记已恢复。` : "没有可导入的笔记（文件为空或格式不对）。");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="law-academy law-notes-page">
      <header className="law-notes-page__head">
        <Link to="/law" className="law-notes-page__back">← 学习中心</Link>
        <h1>📝 我的笔记</h1>
        <p className="law-notes-page__lead">
          课时里写下的理解都收在这里：按学科与课时归档，搜关键词、导出备份、换设备导入。
        </p>
        <div className="law-notes-page__toolbar">
          <input
            type="search"
            className="law-notes-page__search"
            placeholder="搜索笔记关键词……"
            value={keyword}
            aria-label="搜索笔记关键词"
            onChange={(event) => setKeyword(event.target.value)}
          />
          <button
            type="button"
            className="law-notes-page__tool"
            onClick={() => exportAllNotes()}
            disabled={!hasNotes}
          >
            ⬇️ 导出 JSON
          </button>
          <button
            type="button"
            className="law-notes-page__tool"
            onClick={() => fileInputRef.current?.click()}
          >
            ⬆️ 导入恢复
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="law-notes-page__file"
            aria-label="选择要导入的笔记 JSON 文件"
            onChange={(event) => void handleImportFile(event.target.files?.[0])}
          />
        </div>
        {importFeedback ? (
          <p className="law-notes-page__feedback" role="status" aria-live="polite">
            {importFeedback}
          </p>
        ) : null}
      </header>

      {!hasNotes ? (
        <div className="law-notes-page__empty" aria-live="polite">
          <LawMascot mood="cheer" size={88} />
          <h2>还没有笔记</h2>
          <p>
            学完一节课，在总结页下方就能写笔记——记下容易混的地方、自己的例子，
            这里会帮你按课时收好。
          </p>
          <Link to="/law" className="law-notes-page__empty-cta">去写第一篇笔记 →</Link>
        </div>
      ) : (
        <>
          {searching ? (
            <p className="law-notes-page__result-info" role="status" aria-live="polite">
              「{query.trim()}」命中 {filtered.length} 条笔记
            </p>
          ) : null}
          {filtered.length === 0 ? (
            <div className="law-notes-page__empty" aria-live="polite">
              <LawMascot mood="idle" size={72} />
              <h2>没找到相关笔记</h2>
              <p>换个关键词试试，或者清空搜索框看全部。</p>
              <button type="button" className="law-notes-page__empty-cta" onClick={() => setKeyword("")}>
                清空搜索
              </button>
            </div>
          ) : (
            <>
              {directoryError ? (
                <p className="law-notes-page__error" role="alert">
                  课名目录加载失败（{directoryError}）——不影响阅读，下面用课时编号展示。
                </p>
              ) : null}
              {!directory && !directoryError ? (
                <p className="law-notes-page__loading" aria-live="polite">正在翻笔记……</p>
              ) : null}
              {groups.map((group) => (
                <section
                  key={group.subject?.id ?? "other"}
                  className="law-notes-page__subject"
                  aria-label={group.subject ? `${group.subject.name}的笔记` : "其他笔记"}
                  style={
                    group.subject
                      ? ({ "--law-accent": group.subject.accent } as CSSProperties)
                      : undefined
                  }
                >
                  <h2>
                    {group.subject ? `${group.subject.emoji} ${group.subject.name}` : "📁 其他"}{" "}
                    <span>{group.lessons.reduce((sum, lesson) => sum + lesson.notes.length, 0)} 条</span>
                  </h2>
                  {group.lessons.map((lesson) => (
                    <div key={lesson.lessonId} className="law-notes-page__lesson">
                      <header className="law-notes-page__lesson-head">
                        <b>{lesson.title}</b>
                        {lesson.chapterTitle ? <small>{lesson.chapterTitle}</small> : null}
                      </header>
                      <ul>
                        {lesson.notes.map((note) => (
                          <li key={note.id}>
                            <PrefetchLink
                              to={`/law/learn/${lesson.lessonId}`}
                              className="law-notes-page__note"
                              title="打开这节课"
                            >
                              <p>
                                <Highlighted text={note.excerpt ?? note.text} query={query} />
                              </p>
                              <footer>
                                <time dateTime={new Date(note.updatedAt).toISOString()}>
                                  {note.updatedAt - note.createdAt > 60_000 ? "编辑于 " : ""}
                                  {formatStamp(note.updatedAt)}
                                </time>
                                {note.stepId ? <span className="law-notes__step-tag">📍 关联步骤</span> : null}
                                <span className="law-notes-page__go">回顾本课 →</span>
                              </footer>
                            </PrefetchLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              ))}
            </>
          )}
        </>
      )}
      <LawEggListener />
    </div>
  );
}

const stampFormat = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatStamp(timestamp: number): string {
  try {
    return stampFormat.format(new Date(timestamp));
  } catch {
    return "";
  }
}
