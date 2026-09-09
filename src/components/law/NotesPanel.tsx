import { useCallback, useEffect, useRef, useState } from "react";
import {
  LAW_NOTES_EVENT,
  LAW_NOTES_STORAGE_KEY as NOTES_STORAGE_KEY,
  LAW_NOTE_MAX_LENGTH,
  addNote,
  deleteNote,
  getLessonNotes,
  updateNote,
  type LawNote,
} from "../../lib/law-notes";
import "../../styles/law-notes.css";

const timeFormat = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTime(timestamp: number): string {
  try {
    return timeFormat.format(new Date(timestamp));
  } catch {
    return "";
  }
}

/** 自动保存的防抖间隔（输入停顿 500ms 落盘；失焦立即 flush） */
const AUTOSAVE_DELAY = 500;

/**
 * 课时内笔记面板（P3）：挂在 LessonPlayer 总结页下方。
 * 新增/编辑共用"输入停顿 500ms 或失焦即保存"的防抖策略；卸载时 flush 未落盘的草稿，不丢字。
 */
export function NotesPanel({
  lessonId,
  stepId,
  stepHint,
}: {
  lessonId: string;
  /** 新笔记自动关联的步骤（步骤完成区随手记的场景） */
  stepId?: string;
  /** 步骤标签的展示文案（如"第 3 步"），仅用于 UI 标注 */
  stepHint?: string;
}) {
  const [notes, setNotes] = useState<LawNote[]>(() => getLessonNotes(lessonId));
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const editingRef = useRef({ id: editingId, text: editingText });
  editingRef.current = { id: editingId, text: editingText };
  const stepRef = useRef(stepId);
  stepRef.current = stepId;
  const timerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);

  const refresh = useCallback(() => {
    setNotes(getLessonNotes(lessonId));
  }, [lessonId]);

  // 任何来源的笔记变更（含本面板写入、导入）都即时重查；其他标签页的写入走 storage 事件
  useEffect(() => {
    const handler = () => refresh();
    document.addEventListener(LAW_NOTES_EVENT, handler);
    return () => document.removeEventListener(LAW_NOTES_EVENT, handler);
  }, [refresh]);

  useEffect(() => {
    const crossTab = (event: StorageEvent) => {
      if (event.key === NOTES_STORAGE_KEY || event.key === null) refresh();
    };
    window.addEventListener("storage", crossTab);
    return () => window.removeEventListener("storage", crossTab);
  }, [refresh]);

  const showSaved = useCallback(() => {
    setSavedFlash(true);
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setSavedFlash(false), 1600);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const saveNew = useCallback(() => {
    const text = draftRef.current.trim().slice(0, LAW_NOTE_MAX_LENGTH);
    if (!text) return false;
    const added = addNote(lessonId, text, stepRef.current);
    if (added) {
      setDraft("");
      showSaved();
    }
    return added !== null;
  }, [lessonId, showSaved]);

  const saveEdit = useCallback(() => {
    const { id, text } = editingRef.current;
    if (!id) return false;
    const trimmed = text.trim().slice(0, LAW_NOTE_MAX_LENGTH);
    if (!trimmed) return false;
    const ok = updateNote(lessonId, id, trimmed);
    if (ok) showSaved();
    return ok;
  }, [lessonId, showSaved]);

  /** 防抖保存：每次输入重置 500ms 计时器，停顿即落盘 */
  const scheduleSave = useCallback(
    (save: () => boolean) => {
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        save();
      }, AUTOSAVE_DELAY);
    },
    [clearTimer],
  );

  /** 失焦立即落盘（清掉计时器避免二次保存） */
  const flushOnBlur = useCallback(
    (save: () => boolean) => {
      clearTimer();
      save();
    },
    [clearTimer],
  );

  // 卸载（进自测/离开总结页）时把没落盘的草稿写进去——防抖攒着的字不能丢
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
      const pendingNew = draftRef.current.trim();
      if (pendingNew) addNote(lessonId, pendingNew, stepRef.current);
      const { id, text } = editingRef.current;
      if (id) {
        const pendingEdit = text.trim();
        if (pendingEdit) updateNote(lessonId, id, pendingEdit);
      }
    };
  }, [lessonId]);

  const originalRef = useRef<{ id: string | null; text: string }>({ id: null, text: "" });

  function startEdit(note: LawNote) {
    clearTimer();
    setConfirmDeleteId(null);
    originalRef.current = { id: note.id, text: note.text };
    setEditingId(note.id);
    setEditingText(note.text);
  }

  function cancelEdit() {
    clearTimer();
    // 自动保存可能已把中间版本落盘：取消 = 还原到编辑前文本
    const { id, text } = originalRef.current;
    if (id && editingRef.current.text.trim() !== text) updateNote(lessonId, id, text);
    setEditingId(null);
    setEditingText("");
  }

  function finishEdit() {
    flushOnBlur(saveEdit);
    setEditingId(null);
    setEditingText("");
  }

  function handleDelete(noteId: string) {
    deleteNote(lessonId, noteId);
    setConfirmDeleteId(null);
  }

  const nearLimit = draft.length >= LAW_NOTE_MAX_LENGTH * 0.9;

  return (
    <section className="law-notes" aria-label="本课笔记">
      <header className="law-notes__head">
        <h2>📝 我的笔记</h2>
        {savedFlash ? (
          <span className="law-notes__saved" role="status">已保存 ✓</span>
        ) : (
          <span className="law-notes__count">{notes.length} 条</span>
        )}
      </header>

      {notes.length === 0 ? (
        <p className="law-notes__empty" aria-live="polite">
          这门课还没有笔记，写下你的理解吧。
        </p>
      ) : (
        <ul className="law-notes__list">
          {notes.map((note) =>
            editingId === note.id ? (
              <li key={note.id} className="law-notes__item is-editing">
                <textarea
                  className="law-notes__textarea"
                  value={editingText}
                  maxLength={LAW_NOTE_MAX_LENGTH}
                  aria-label="编辑笔记"
                  onChange={(event) => {
                    setEditingText(event.target.value);
                    scheduleSave(saveEdit);
                  }}
                  onBlur={() => flushOnBlur(saveEdit)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") cancelEdit();
                  }}
                />
                <div className="law-notes__actions">
                  <button type="button" className="law-notes__btn is-primary" onClick={finishEdit}>
                    保存
                  </button>
                  <button type="button" className="law-notes__btn" onClick={cancelEdit}>
                    取消
                  </button>
                </div>
              </li>
            ) : (
              <li key={note.id} className="law-notes__item">
                <p className="law-notes__item-text">{note.text}</p>
                <div className="law-notes__meta">
                  {note.stepId ? <span className="law-notes__step-tag">📍 关联步骤</span> : null}
                  <time dateTime={new Date(note.createdAt).toISOString()}>
                    {formatTime(note.createdAt)}
                  </time>
                  {note.updatedAt - note.createdAt > 60_000 ? <span>已编辑</span> : null}
                  {confirmDeleteId === note.id ? (
                    <span className="law-notes__confirm">
                      确认删除？删了就找不回来了
                      <button type="button" className="law-notes__btn is-danger" onClick={() => handleDelete(note.id)}>
                        确认删除
                      </button>
                      <button
                        type="button"
                        className="law-notes__btn"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        取消
                      </button>
                    </span>
                  ) : (
                    <span className="law-notes__actions">
                      <button type="button" className="law-notes__btn" onClick={() => startEdit(note)}>
                        编辑
                      </button>
                      <button
                        type="button"
                        className="law-notes__btn"
                        onClick={() => setConfirmDeleteId(note.id)}
                      >
                        删除
                      </button>
                    </span>
                  )}
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {editingId === null ? (
        <div className="law-notes__composer">
          <label className="law-notes__composer-label" htmlFor="law-notes-draft">
            记点什么{stepHint ? `（将关联${stepHint}）` : ""}
          </label>
          <textarea
            id="law-notes-draft"
            className="law-notes__textarea"
            value={draft}
            maxLength={LAW_NOTE_MAX_LENGTH}
            placeholder="写下这一步的理解、容易混的地方、自己的例子……"
            onChange={(event) => {
              setDraft(event.target.value);
              scheduleSave(saveNew);
            }}
            onBlur={() => flushOnBlur(saveNew)}
          />
          <div className="law-notes__composer-foot">
            {nearLimit ? (
              <span className="law-notes__limit" aria-live="polite">
                {draft.length}/{LAW_NOTE_MAX_LENGTH}
              </span>
            ) : <span />}
            <button
              type="button"
              className="law-notes__btn is-primary"
              onClick={() => {
                clearTimer();
                saveNew();
              }}
              disabled={!draft.trim()}
            >
              保存笔记
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
