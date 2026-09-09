import { safeLocalStorage } from "./browser-storage";

/** 学习笔记数据层（P3）：独立存储键，与进度库互不干扰。
 *  旧数据没有本键 → 读出空库即向后兼容；损坏 JSON → try/catch 回退空库。 */

const KEY = "nhb-law-notes-v1";

export interface LawNote {
  id: string;
  /** 关联的课时步骤（可选：步骤完成区随手记的笔记自动带上） */
  stepId?: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface LawBookmark {
  stepId: string;
  label: string;
  createdAt: number;
}

export interface LawLessonNotes {
  notes: LawNote[];
  bookmarks: LawBookmark[];
}

/** lessonId → 该课的笔记与书签 */
export type LawNotesStore = Record<string, LawLessonNotes>;

/** 笔记增删改后派发的 document 事件（总览页/面板即时刷新用），对齐 LAW_PROGRESS_EVENT 模式 */
export const LAW_NOTES_EVENT = "nhb-law-notes";

/** 全库笔记总上限（跨课时合计）：超出按 FIFO 淘汰 createdAt 最旧的 */
export const LAW_NOTES_CAP = 500;

/** 单条笔记文本上限：写时截断，防超长文本撑爆 localStorage */
export const LAW_NOTE_MAX_LENGTH = 2000;

/** 搜索摘要的上下文半径（命中词前后各取多少字） */
const EXCERPT_RADIUS = 40;

/** 搜索命中（带课时上下文：lessonId 供总览页解析课名/跳转） */
export interface LawNoteMatch {
  lessonId: string;
  note: LawNote;
  /** 命中词附近的摘要（…前后文…） */
  excerpt: string;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeNote(raw: unknown): LawNote | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Partial<LawNote>;
  if (typeof rec.id !== "string" || rec.id.length === 0) return null;
  if (typeof rec.text !== "string") return null;
  if (typeof rec.createdAt !== "number" || !Number.isFinite(rec.createdAt)) return null;
  if (typeof rec.updatedAt !== "number" || !Number.isFinite(rec.updatedAt)) return null;
  const note: LawNote = {
    id: rec.id,
    text: rec.text.slice(0, LAW_NOTE_MAX_LENGTH),
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  };
  if (typeof rec.stepId === "string" && rec.stepId.length > 0) note.stepId = rec.stepId;
  return note;
}

function sanitizeBookmark(raw: unknown): LawBookmark | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Partial<LawBookmark>;
  if (typeof rec.stepId !== "string" || rec.stepId.length === 0) return null;
  if (typeof rec.createdAt !== "number" || !Number.isFinite(rec.createdAt)) return null;
  return {
    stepId: rec.stepId,
    label: typeof rec.label === "string" ? rec.label : "",
    createdAt: rec.createdAt,
  };
}

function sanitizeEntry(raw: unknown): LawLessonNotes | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Partial<LawLessonNotes>;
  const notes = (Array.isArray(rec.notes) ? rec.notes : [])
    .map(sanitizeNote)
    .filter((note): note is LawNote => note !== null);
  const bookmarks = (Array.isArray(rec.bookmarks) ? rec.bookmarks : [])
    .map(sanitizeBookmark)
    .filter((bookmark): bookmark is LawBookmark => bookmark !== null);
  return { notes, bookmarks };
}

function readStore(): LawNotesStore {
  const raw = safeLocalStorage.getItem(KEY);
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object") return {};
  const store: LawNotesStore = {};
  for (const [lessonId, entry] of Object.entries(parsed as Record<string, unknown>)) {
    const sanitized = sanitizeEntry(entry);
    if (sanitized && (sanitized.notes.length > 0 || sanitized.bookmarks.length > 0)) {
      store[lessonId] = sanitized;
    }
  }
  return store;
}

/** 写库前剪掉空条目（notes/bookmarks 都空的课时键不留），保持存储紧凑 */
function writeStore(store: LawNotesStore): void {
  const pruned: LawNotesStore = {};
  for (const [lessonId, entry] of Object.entries(store)) {
    if (entry.notes.length > 0 || entry.bookmarks.length > 0) pruned[lessonId] = entry;
  }
  safeLocalStorage.setItem(KEY, JSON.stringify(pruned));
}

function emitNotesEvent(): void {
  if (typeof document === "undefined" || typeof document.dispatchEvent !== "function") return;
  if (typeof CustomEvent !== "function") return;
  document.dispatchEvent(new CustomEvent(LAW_NOTES_EVENT));
}

function totalNoteCount(store: LawNotesStore): number {
  let total = 0;
  for (const entry of Object.values(store)) total += entry.notes.length;
  return total;
}

/** FIFO 淘汰：全库超出上限时，从 createdAt 最旧的笔记开始丢（书签不受上限约束） */
function enforceCap(store: LawNotesStore): void {
  let total = totalNoteCount(store);
  if (total <= LAW_NOTES_CAP) return;
  const oldest: { lessonId: string; note: LawNote }[] = [];
  for (const [lessonId, entry] of Object.entries(store)) {
    for (const note of entry.notes) oldest.push({ lessonId, note });
  }
  oldest.sort((a, b) => a.note.createdAt - b.note.createdAt);
  for (const { lessonId, note } of oldest) {
    if (total <= LAW_NOTES_CAP) break;
    const entry = store[lessonId];
    if (!entry) continue;
    entry.notes = entry.notes.filter((item) => item.id !== note.id);
    total -= 1;
  }
}

export function getLessonNotes(lessonId: string): LawNote[] {
  return [...(readStore()[lessonId]?.notes ?? [])].sort((a, b) => b.createdAt - a.createdAt);
}

export function getLessonBookmarks(lessonId: string): LawBookmark[] {
  return [...(readStore()[lessonId]?.bookmarks ?? [])].sort((a, b) => a.createdAt - b.createdAt);
}

/** 全部笔记打平（总览页用）：lessonId 附在每条上，按 updatedAt 倒序 */
export function getAllNotes(): (LawNote & { lessonId: string })[] {
  const all: (LawNote & { lessonId: string })[] = [];
  for (const [lessonId, entry] of Object.entries(readStore())) {
    for (const note of entry.notes) all.push({ ...note, lessonId });
  }
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function countAllNotes(): number {
  return totalNoteCount(readStore());
}

/** 截断文本并校验：空串拒绝（返回 null），调用方据此提示 */
export function addNote(lessonId: string, text: string, stepId?: string): LawNote | null {
  const trimmed = text.trim().slice(0, LAW_NOTE_MAX_LENGTH);
  if (!trimmed) return null;
  const store = readStore();
  const entry = store[lessonId] ?? { notes: [], bookmarks: [] };
  const now = Date.now();
  const note: LawNote = { id: makeId(), text: trimmed, createdAt: now, updatedAt: now };
  if (stepId) note.stepId = stepId;
  entry.notes.push(note);
  store[lessonId] = entry;
  enforceCap(store);
  writeStore(store);
  emitNotesEvent();
  return note;
}

export function updateNote(lessonId: string, noteId: string, text: string): boolean {
  const trimmed = text.trim().slice(0, LAW_NOTE_MAX_LENGTH);
  if (!trimmed) return false;
  const store = readStore();
  const entry = store[lessonId];
  const note = entry?.notes.find((item) => item.id === noteId);
  if (!entry || !note) return false;
  note.text = trimmed;
  note.updatedAt = Date.now();
  writeStore(store);
  emitNotesEvent();
  return true;
}

export function deleteNote(lessonId: string, noteId: string): boolean {
  const store = readStore();
  const entry = store[lessonId];
  if (!entry) return false;
  const before = entry.notes.length;
  entry.notes = entry.notes.filter((item) => item.id !== noteId);
  if (entry.notes.length === before) return false;
  writeStore(store);
  emitNotesEvent();
  return true;
}

/** 每课时每步骤一条书签：重复添加覆盖 label（最新语义优先） */
export function addBookmark(lessonId: string, stepId: string, label: string): void {
  const store = readStore();
  const entry = store[lessonId] ?? { notes: [], bookmarks: [] };
  const existing = entry.bookmarks.find((item) => item.stepId === stepId);
  if (existing) {
    existing.label = label;
  } else {
    entry.bookmarks.push({ stepId, label, createdAt: Date.now() });
  }
  store[lessonId] = entry;
  writeStore(store);
  emitNotesEvent();
}

export function removeBookmark(lessonId: string, stepId: string): boolean {
  const store = readStore();
  const entry = store[lessonId];
  if (!entry) return false;
  const before = entry.bookmarks.length;
  entry.bookmarks = entry.bookmarks.filter((item) => item.stepId !== stepId);
  if (entry.bookmarks.length === before) return false;
  writeStore(store);
  emitNotesEvent();
  return true;
}

/** 跨全部课时搜索笔记文本（大小写不敏感），命中带课时上下文与摘要 */
export function searchNotes(keyword: string): LawNoteMatch[] {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return [];
  const matches: LawNoteMatch[] = [];
  for (const note of getAllNotes()) {
    const index = note.text.toLowerCase().indexOf(needle);
    if (index === -1) continue;
    const start = Math.max(0, index - EXCERPT_RADIUS);
    const end = Math.min(note.text.length, index + needle.length + EXCERPT_RADIUS);
    const excerpt =
      (start > 0 ? "…" : "") + note.text.slice(start, end) + (end < note.text.length ? "…" : "");
    const { lessonId, ...rest } = note;
    matches.push({ lessonId, note: rest, excerpt });
  }
  return matches;
}

/** 导出格式：带版本号与导出时间的 JSON 文本（导入侧按 notes 数组合并） */
export function serializeNotesForExport(): string {
  return JSON.stringify({ version: 1, exportedAt: Date.now(), notes: readStore() }, null, 2);
}

/** 浏览器里导出为 JSON 文件下载；无 DOM 环境（单测）只返回 JSON 文本 */
export function exportAllNotes(): string {
  const json = serializeNotesForExport();
  if (typeof document === "undefined" || typeof Blob === "undefined" || typeof URL?.createObjectURL !== "function") {
    return json;
  }
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const day = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `law-notes-${day}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return json;
}

export interface LawImportResult {
  imported: number;
  skipped: number;
}

/** 导入合并（同 id 覆盖，新 id 追加），非法条目跳过；合并后同样执行 500 上限淘汰 */
export function mergeImportedNotes(raw: unknown): LawImportResult {
  let imported = 0;
  let skipped = 0;
  if (!raw || typeof raw !== "object") return { imported, skipped };
  const payload = raw as { notes?: unknown; version?: unknown };
  const lessonEntries =
    payload.notes && typeof payload.notes === "object"
      ? (payload.notes as Record<string, unknown>)
      : null;
  if (!lessonEntries) return { imported, skipped };
  const store = readStore();
  for (const [lessonId, entryRaw] of Object.entries(lessonEntries)) {
    const incoming = sanitizeEntry(entryRaw);
    if (!incoming) {
      const rawEntry = entryRaw as { notes?: unknown } | null;
      skipped += Array.isArray(rawEntry?.notes) ? rawEntry.notes.length : 0;
      continue;
    }
    const existing = store[lessonId] ?? { notes: [], bookmarks: [] };
    const rawEntry = entryRaw as { notes?: unknown } | null;
    const rawCount = Array.isArray(rawEntry?.notes) ? rawEntry.notes.length : 0;
    skipped += rawCount - incoming.notes.length; // 单条字段缺失被防腐过滤的计入 skipped
    for (const note of incoming.notes) {
      const clash = existing.notes.findIndex((item) => item.id === note.id);
      if (clash >= 0) {
        existing.notes[clash] = note;
      } else {
        existing.notes.push(note);
      }
      imported += 1;
    }
    for (const bookmark of incoming.bookmarks) {
      const clash = existing.bookmarks.findIndex((item) => item.stepId === bookmark.stepId);
      if (clash >= 0) {
        existing.bookmarks[clash] = bookmark;
      } else {
        existing.bookmarks.push(bookmark);
      }
    }
    store[lessonId] = existing;
  }
  enforceCap(store);
  writeStore(store);
  if (imported > 0) emitNotesEvent();
  return { imported, skipped };
}

/** 从 JSON 文件恢复：文件读取/解析失败返回 0 导入（不 throw） */
export async function importNotes(file: File): Promise<LawImportResult> {
  try {
    const text = await file.text();
    return mergeImportedNotes(JSON.parse(text) as unknown);
  } catch {
    return { imported: 0, skipped: 0 };
  }
}
