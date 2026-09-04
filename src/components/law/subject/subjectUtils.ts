import type { LawBook, LawChapter, LawLesson } from "../../../types/law";
import { LAW_GRAPHIC_MAP } from "../../../data/law/graphics";
import type { LawProgressMap } from "../../../lib/law-progress";

/** 清洗运行页眉残留符号与"第X部分/第X章"前缀，还原章节真实名称 */
export function cleanHeading(text: string): string {
  return text
    .replace(/[○◎●◆・•·✦☆]/g, "")
    .replace(/^\s*第[一二三四五六七八九十百零0-9]+(编|部分|章|篇|卷)\s*/, "")
    .replace(/^\s*(上编|下编|附编)\s*/, "")
    .trim();
}

/** 章节语义名：构建管线提供的 semanticTitle > breadcrumb 反推 > 课时标题提炼 > 清洗后标题 */
export function semanticChapterTitle(chapter: LawChapter): string {
  if (/^(作者的话|使用说明)$/.test(chapter.title)) return chapter.title;
  if (chapter.semanticTitle && chapter.semanticTitle.length >= 2) return chapter.semanticTitle;
  const crumbs = chapter.lessons[0]?.breadcrumb ?? [];
  const candidates = crumbs.map(cleanHeading).filter((text) => {
    if (!text || text.length < 2) return false;
    if (/^(作者的话|使用说明|导览|群|遗留|全书)$/.test(text)) return false;
    if (/^(上编|下编|绪论|导论)$/.test(text)) return false;
    return true;
  });
  if (candidates.length > 0) return candidates[candidates.length - 1];
  // 数据未提供语义名时，从首个课时标题提炼（如"法学的概念、层次…"→"法学"）
  const lessonTitle = chapter.lessons[0]?.title ?? "";
  const head = lessonTitle
    .replace(/^(简述|简答|论述|分析|评述|试述|说明|比较|谈谈|导览)/, "")
    .split(/[（(]/)[0]
    .split(/[、，。；：]/)[0]
    .slice(0, 10);
  if (head && head.length >= 2) return head;
  return cleanHeading(chapter.title) || chapter.title;
}

/** 快速浏览包：同一章内连续的 1 步课聚合为一个"速览包" */
export function buildQuickPacks(chapter: LawChapter): LawLesson[][] {
  const packs: LawLesson[][] = [];
  let current: LawLesson[] = [];
  for (const lesson of chapter.lessons) {
    if (lesson.steps.length <= 1) {
      current.push(lesson);
    } else {
      if (current.length >= 3) packs.push(current);
      current = [];
    }
  }
  if (current.length >= 3) packs.push(current);
  return packs;
}

/** 课时元信息 */
export function lessonMeta(lesson: LawLesson) {
  const steps = lesson.steps.length;
  const minutes = Math.max(1, Math.round((steps * 20) / 60));
  return { steps, minutes };
}

export function lessonKindEmoji(lesson: LawLesson): string {
  const kind = lesson.steps[0]?.kind ?? "plain";
  const map: Record<string, string> = {
    definition: "📖",
    list: "🗂️",
    compare: "⚖️",
    mnemonic: "🧠",
    timeline: "🕰️",
    condition: "🔑",
    exception: "⚠️",
    flow: "🔗",
    plain: "📝",
  };
  return map[kind] ?? "📝";
}

export function lessonKindLabel(lesson: LawLesson): string {
  const kind = lesson.steps[0]?.kind ?? "plain";
  const map: Record<string, string> = {
    definition: "定义",
    list: "列举",
    compare: "对比",
    mnemonic: "口诀",
    timeline: "时间线",
    condition: "要件",
    exception: "例外",
    flow: "流程",
    plain: "细读",
  };
  return map[kind] ?? "细读";
}

export function isGraphicLesson(lesson: LawLesson): boolean {
  return LAW_GRAPHIC_MAP[lesson.id] !== undefined;
}

/** 在书中查找课时 */
export function findLessonInBook(book: LawBook, lessonId: string): { lesson: LawLesson; chapter: LawChapter } | null {
  for (const chapter of book.chapters) {
    const lesson = chapter.lessons.find((item) => item.id === lessonId);
    if (lesson) return { lesson, chapter };
  }
  return null;
}

export function progressOf(progress: LawProgressMap, lessonId: string) {
  return progress[lessonId] ?? null;
}
