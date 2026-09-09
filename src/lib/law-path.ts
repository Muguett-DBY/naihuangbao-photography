import type { LawBook, LawChapter, LawLesson } from "../types/law";
import { isShellLesson } from "../types/law";
import type { LawProgressMap } from "./law-progress";

/**
 * 关卡地图的纯逻辑层：把一本书折算成"学习路径"的分段节点流。
 * 与 LessonPlayer/学科页共用同一口径——学习流 = 非空壳课 + 非附录章；
 * 书前说明章节（作者的话/使用说明）不是考点，排到路径最末尾，不挡住第一课。
 */

export type PathNodeState = "done" | "current" | "todo";

export interface PathNode {
  lesson: LawLesson;
  /** 路径序号（1-based，沿路径递增） */
  order: number;
  state: PathNodeState;
  /** 错题已到复习期（应在现在去测） */
  reviewDue: boolean;
  /** 在错题本中尚未毕业（答错过且复习未走完） */
  inWrongBook: boolean;
}

export interface PathSection {
  chapter: LawChapter;
  title: string;
  /** 书前说明章节：视觉上弱化为"附注"段 */
  isMeta: boolean;
  nodes: PathNode[];
  doneCount: number;
}

export interface LessonPath {
  sections: PathSection[];
  /** 扁平节点流（跨章节连续编号） */
  nodes: PathNode[];
  /** 当前应学的节点下标；-1 = 全部完成 */
  currentIndex: number;
  total: number;
  done: number;
  allDone: boolean;
}

const META_TITLE = /^(作者的话|使用说明|序言|前言|后记)$/;

function isMetaChapter(chapter: Pick<LawChapter, "title" | "semanticTitle">): boolean {
  return [chapter.title, chapter.semanticTitle ?? ""].some((name) => META_TITLE.test(name.trim()));
}

export function buildLessonPath(
  book: LawBook,
  progress: LawProgressMap,
  now: number = Date.now(),
): LessonPath {
  const chapters = book.chapters.filter((chapter) => !chapter.appendix);
  const ordered = [
    ...chapters.filter((chapter) => !isMetaChapter(chapter)),
    ...chapters.filter(isMetaChapter),
  ];

  const sections: PathSection[] = [];
  const nodes: PathNode[] = [];
  let currentIndex = -1;

  for (const chapter of ordered) {
    const sectionNodes: PathNode[] = [];
    for (const lesson of chapter.lessons) {
      // 索引空壳课不进路径（与 lessonCount 同口径）
      if (isShellLesson(lesson)) continue;
      const p = progress[lesson.id];
      const node: PathNode = {
        lesson,
        order: nodes.length + 1,
        state: "todo",
        reviewDue: p?.reviewDueAt !== undefined && p.reviewDueAt <= now,
        inWrongBook: (p?.wrongCount ?? 0) > 0 && p?.reviewDueAt !== undefined,
      };
      if (p?.completedAt) {
        node.state = "done";
      } else if (currentIndex === -1) {
        // 沿路径第一个未完成的课 = 当前位置（唯一）
        node.state = "current";
        currentIndex = nodes.length;
      }
      sectionNodes.push(node);
      nodes.push(node);
    }
    if (sectionNodes.length === 0) continue;
    sections.push({
      chapter,
      title: chapter.semanticTitle ?? chapter.title,
      isMeta: isMetaChapter(chapter),
      nodes: sectionNodes,
      doneCount: sectionNodes.filter((node) => node.state === "done").length,
    });
  }

  return {
    sections,
    nodes,
    currentIndex,
    total: nodes.length,
    done: nodes.filter((node) => node.state === "done").length,
    allDone: currentIndex === -1 && nodes.length > 0,
  };
}
