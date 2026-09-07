import type { LawBook, LawChapter, LawLesson, LawSubjectId, LawStepKind } from "../../types/law";
import { isCleanTerm, isShellLesson } from "../../types/law";

/**
 * 法学数据加载器（分块架构）：
 * - 内容由 npm run law:chunks 切成「轻元数据 meta + 正文分块 part」两层，
 *   Vite 用 ?url glob 把它们发成哈希静态资源，这里只持有文件名映射（KB 级）。
 * - 进一节课只拉 meta + 本课所在分块（此前是整本书 1.5MB+）。
 * - loadLawBook 仍返回完整 LawBook（目录/搜索/图解页依赖），内部由分块无损装配，
 *   装配等价性由 loader-chunks.test.ts 全量锁定。
 */

interface LawMetaLesson {
  i: string;
  t: string;
  s: number;
  k: LawStepKind;
  /** 1 = 学习流课时（与 isFlowLesson 等价） */
  f: 0 | 1;
}

interface LawMetaChapter {
  id: string;
  t: string;
  st?: string;
  lv: LawChapter["level"];
  /** 1 = 附录章 */
  ax?: 1;
  ls: LawMetaLesson[];
  /** 含本章内容的 part 文件（装配顺序） */
  parts: string[];
  /** 与 parts 对齐：每个 part 覆盖的章内课数 */
  spans: number[];
}

interface LawMeta {
  id: LawSubjectId;
  name: string;
  fullName: string;
  emoji: string;
  accent: string;
  accentSoft: string;
  lessonCount: number;
  leftover: string[];
  parts: string[];
  chapters: LawMetaChapter[];
  /** digests[chapterId] = 每课的清洗后词条（collectSiblingTerms 的构建期摘要） */
  digests: Record<string, string[][]>;
}

interface LawPart {
  f: string;
  segments: { c: string; from: number; lessons: LawLesson[] }[];
}

const CHUNK_URLS: Record<LawSubjectId, Record<string, string>> = {
  falixue: import.meta.glob<string>("./chunks/falixue/*.json", { query: "?url", import: "default", eager: true }),
  xianfa: import.meta.glob<string>("./chunks/xianfa/*.json", { query: "?url", import: "default", eager: true }),
  zhishixiang: import.meta.glob<string>("./chunks/zhishixiang/*.json", { query: "?url", import: "default", eager: true }),
  minfa: import.meta.glob<string>("./chunks/minfa/*.json", { query: "?url", import: "default", eager: true }),
  xingfa: import.meta.glob<string>("./chunks/xingfa/*.json", { query: "?url", import: "default", eager: true }),
};

function chunkUrl(subject: LawSubjectId, fileName: string): string {
  const map = CHUNK_URLS[subject];
  const url = map[`./chunks/${subject}/${fileName}`];
  if (!url) throw new Error(`law chunks missing: ${subject}/${fileName}（重跑 npm run law:chunks）`);
  return url;
}

/** 同一 JSON 只 fetch 一次；并发调用共享同一个 Promise */
const jsonCache = new Map<string, Promise<unknown>>();

function fetchJson<T>(url: string): Promise<T> {
  const cached = jsonCache.get(url);
  if (cached) return cached as Promise<T>;
  const request = fetch(url).then((response) => {
    if (!response.ok) throw new Error(`law data ${url} → HTTP ${response.status}`);
    return response.json() as Promise<T>;
  });
  jsonCache.set(url, request);
  request.catch(() => jsonCache.delete(url));
  return request;
}

function loadMeta(subject: LawSubjectId): Promise<LawMeta> {
  return fetchJson<LawMeta>(chunkUrl(subject, `${subject}-meta.json`));
}

/** 分块 → 完整书（保序装配；与原整本 JSON 结构级等价，测试锁定） */
function assembleBook(meta: LawMeta, parts: LawPart[]): LawBook {
  const lessonsByChapter = new Map<string, LawLesson[]>();
  for (const part of parts) {
    for (const segment of part.segments) {
      const list = lessonsByChapter.get(segment.c) ?? [];
      for (const lesson of segment.lessons) list.push(lesson);
      lessonsByChapter.set(segment.c, list);
    }
  }
  return {
    id: meta.id,
    name: meta.name,
    fullName: meta.fullName,
    emoji: meta.emoji,
    accent: meta.accent,
    accentSoft: meta.accentSoft,
    chapters: meta.chapters.map((mc): LawChapter => {
      const chapter: LawChapter = {
        id: mc.id,
        title: mc.t,
        level: mc.lv,
        lessons: lessonsByChapter.get(mc.id) ?? [],
      };
      if (mc.st !== undefined) chapter.semanticTitle = mc.st;
      if (mc.ax === 1) chapter.appendix = true;
      return chapter;
    }),
    lessonCount: meta.lessonCount,
    leftover: meta.leftover,
  };
}

const bookPromises = new Map<LawSubjectId, Promise<LawBook>>();

/** 让出主线程一帧：整本装配的 JSON.parse 分片执行，避免单个数百 ms 长任务卡输入 */
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function loadLawBook(subject: LawSubjectId): Promise<LawBook> {
  let promise = bookPromises.get(subject);
  if (!promise) {
    promise = (async () => {
      const meta = await loadMeta(subject);
      const responses = await Promise.all(meta.parts.map((file) => fetch(chunkUrl(subject, file), { cache: "default" })));
      for (const response of responses) {
        if (!response.ok) throw new Error(`law data ${response.url} → HTTP ${response.status}`);
      }
      const parts: LawPart[] = [];
      for (const response of responses) {
        parts.push((await response.json()) as LawPart);
        await yieldToMain();
      }
      return assembleBook(meta, parts);
    })();
    bookPromises.set(subject, promise);
    promise.catch(() => bookPromises.delete(subject));
  }
  return promise;
}

export interface LawLessonRef {
  subject: LawSubjectId;
  lesson: LawLesson;
  /** 该书第几个知识点（1-based） */
  order: number;
  total: number;
}

/** 汇总所有课时引用，供首页/下一篇导航使用。 */
export async function loadLawLessonIndex(subject: LawSubjectId): Promise<{
  book: LawBook;
  lessons: LawLessonRef[];
}> {
  const book = await loadLawBook(subject);
  const lessons: LawLessonRef[] = [];
  book.chapters.forEach((chapter) => {
    chapter.lessons.forEach((lesson) => {
      lessons.push({ subject, lesson, order: lessons.length + 1, total: book.lessonCount });
    });
  });
  return { book, lessons };
}

export function findLesson(
  book: LawBook,
  lessonId: string,
): { lesson: LawLesson; order: number; total: number } | null {
  let order = 0;
  for (const chapter of book.chapters) {
    for (const lesson of chapter.lessons) {
      order += 1;
      if (lesson.id === lessonId) {
        return { lesson, order, total: book.lessonCount };
      }
    }
  }
  return null;
}

/** 学习流课时：索引空壳课与附录章（考点索引）不进学习流 */
export function isFlowLesson(chapter: { appendix?: boolean }, lesson: LawLesson): boolean {
  return !chapter.appendix && !isShellLesson(lesson);
}

/**
 * 学习流的下一课：跳过索引空壳课与附录章课时。
 * 直接取"下一个存在的学习流课时"判定有没有下一课——
 * 绝不能用"全书序号 < lessonCount"判断：序号含空壳/附录课，lessonCount 不含，
 * 两边口径不一致会把书尾几十课的「下一课」错误吞掉。
 */
export function nextFlowLesson(book: LawBook, lessonId: string): LawLesson | null {
  const flat = book.chapters.flatMap((chapter) =>
    chapter.lessons.map((lesson) => ({ chapter, lesson })),
  );
  const index = flat.findIndex((entry) => entry.lesson.id === lessonId);
  if (index < 0) return null;
  for (let i = index + 1; i < flat.length; i += 1) {
    if (isFlowLesson(flat[i].chapter, flat[i].lesson)) return flat[i].lesson;
  }
  return null;
}

/** 收集同章其它课的概念词，供选择题干扰项使用（答案永远出自本课） */
export function collectSiblingTerms(book: LawBook, lessonId: string): string[] {
  const terms: string[] = [];
  for (const chapter of book.chapters) {
    const current = chapter.lessons.find((lesson) => lesson.id === lessonId);
    if (!current) continue;
    for (const lesson of chapter.lessons) {
      if (lesson.id === lessonId) continue;
      for (const step of lesson.steps) {
        for (const term of step.terms ?? []) {
          const cleaned = term.term?.trim().replace(/^[（(【[]|[）)】\]]$/g, "").trim();
          if (cleaned && isCleanTerm(cleaned) && !terms.includes(cleaned)) {
            terms.push(cleaned);
          }
        }
        if (terms.length >= 40) break;
      }
      if (terms.length >= 40) break;
    }
    break;
  }
  return terms.slice(0, 40);
}

/** ── 课时级轻量加载（进一节课 = meta + 1 个正文分块，不再下载整本书）── */

export interface LawLessonView {
  subject: LawSubjectId;
  lesson: LawLesson;
  chapterId: string;
  chapterTitle: string;
  chapterSemanticTitle?: string;
  /** 全书序号（含空壳/附录课，与 findLesson 口径一致） */
  order: number;
  total: number;
  /** 学习流的下一课 id（meta 推导，语义与 nextFlowLesson 等价）；null = 已是最后一课 */
  nextFlowId: string | null;
  /** 同章其它课概念词（词条 digest 推导，与 collectSiblingTerms 全量等价） */
  siblingTerms: string[];
}

function nextFlowIdFromMeta(meta: LawMeta, fromChapter: number, fromLesson: number): string | null {
  for (let c = fromChapter; c < meta.chapters.length; c += 1) {
    const start = c === fromChapter ? fromLesson + 1 : 0;
    const lessons = meta.chapters[c].ls;
    for (let i = start; i < lessons.length; i += 1) {
      if (lessons[i].f === 1) return lessons[i].i;
    }
  }
  return null;
}

/** 词条 digest 扫描：跳过 skipIndex 课，与 collectSiblingTerms 同一去重/截断语义 */
function siblingTermsFromDigest(digest: string[][], skipIndex: number): string[] {
  const terms: string[] = [];
  for (let i = 0; i < digest.length && terms.length < 40; i += 1) {
    if (i === skipIndex) continue;
    for (const term of digest[i]) {
      if (!terms.includes(term)) terms.push(term);
      if (terms.length >= 40) break;
    }
  }
  return terms.slice(0, 40);
}

/** 课时不存在时 resolve 为 null（调用方渲染"未找到"，与加载失败区分） */
export async function loadLawLessonView(
  subject: LawSubjectId,
  lessonId: string,
): Promise<LawLessonView | null> {
  const meta = await loadMeta(subject);

  let order = 0;
  let hit: { chapterIndex: number; lessonIndex: number; meta: LawMetaLesson } | null = null;
  for (let c = 0; c < meta.chapters.length && !hit; c += 1) {
    const ls = meta.chapters[c].ls;
    for (let i = 0; i < ls.length; i += 1) {
      order += 1;
      if (ls[i].i === lessonId) {
        hit = { chapterIndex: c, lessonIndex: i, meta: ls[i] };
        break;
      }
    }
  }
  if (!hit) return null;

  const mc = meta.chapters[hit.chapterIndex];
  // 用 spans 把"章内第几课"折算到具体 part 文件；段内偏移仍用章内全局下标对 from
  let remaining = hit.lessonIndex;
  let partFile = mc.parts[mc.parts.length - 1];
  for (let p = 0; p < mc.parts.length; p += 1) {
    if (remaining < mc.spans[p]) {
      partFile = mc.parts[p];
      break;
    }
    remaining -= mc.spans[p];
  }

  const part = await fetchJson<LawPart>(chunkUrl(subject, partFile));
  const segment = part.segments.find(
    (entry) =>
      entry.c === mc.id &&
      hit.lessonIndex >= entry.from &&
      hit.lessonIndex < entry.from + entry.lessons.length,
  );
  if (!segment) throw new Error(`law chunk ${subject}/${partFile} 缺少 ${lessonId}（重跑 npm run law:chunks）`);
  const lesson = segment.lessons[hit.lessonIndex - segment.from];

  const view: LawLessonView = {
    subject,
    lesson,
    chapterId: mc.id,
    chapterTitle: mc.t,
    chapterSemanticTitle: mc.st,
    order,
    total: meta.lessonCount,
    nextFlowId: nextFlowIdFromMeta(meta, hit.chapterIndex, hit.lessonIndex),
    siblingTerms: siblingTermsFromDigest(meta.digests[mc.id] ?? [], hit.lessonIndex),
  };
  if (view.chapterSemanticTitle === undefined) delete view.chapterSemanticTitle;
  return view;
}

/** 预取一节课的正文分块（hover/focus 时调用；静默失败，不打断浏览） */
export function prefetchLawLesson(subject: LawSubjectId, lessonId: string): void {
  void (async () => {
    const meta = await loadMeta(subject);
    for (let c = 0; c < meta.chapters.length; c += 1) {
      const lessonIndex = meta.chapters[c].ls.findIndex((lesson) => lesson.i === lessonId);
      if (lessonIndex < 0) continue;
      const mc = meta.chapters[c];
      let inChapterIndex = lessonIndex;
      let partFile = mc.parts[mc.parts.length - 1];
      for (let p = 0; p < mc.parts.length; p += 1) {
        if (inChapterIndex < mc.spans[p]) {
          partFile = mc.parts[p];
          break;
        }
        inChapterIndex -= mc.spans[p];
      }
      await fetchJson<LawPart>(chunkUrl(subject, partFile));
      return;
    }
  })().catch(() => undefined);
}

/** ── 全局链接预取：hover/focus 到任何 /law/learn/ 链接就预取该课正文分块 ──
 *  文档级委托，目录/路径地图/错题本（各页自己的 Link 组件）无需逐个接入；
 *  与 PrefetchLink 的时机思路一致（pointerover / focusin / 触摸按下）。 */

const LAW_SUBJECT_IDS: LawSubjectId[] = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"];
const LEARN_LINK_PATTERN = /\/law\/learn\/([a-z]+-q[a-z0-9-]*)/;

function subjectOfLessonId(lessonId: string): LawSubjectId | null {
  const subject = lessonId.split("-q", 1)[0] as LawSubjectId;
  return LAW_SUBJECT_IDS.includes(subject) ? subject : null;
}

function installLawLinkPrefetch(): void {
  if (typeof document === "undefined") return;
  const connection = (navigator as { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return; // 尊重省流量模式
  const prefetched = new Set<string>();
  const onIntent = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest("a[href]");
    if (!anchor) return;
    const lessonId = LEARN_LINK_PATTERN.exec(anchor.getAttribute("href") ?? "")?.[1];
    if (!lessonId || prefetched.has(lessonId)) return;
    const subject = subjectOfLessonId(lessonId);
    if (!subject) return;
    prefetched.add(lessonId);
    prefetchLawLesson(subject, lessonId);
  };
  document.addEventListener("pointerover", onIntent, { passive: true });
  document.addEventListener("focusin", onIntent, { passive: true });
  document.addEventListener("touchstart", onIntent, { passive: true });
}

installLawLinkPrefetch();
