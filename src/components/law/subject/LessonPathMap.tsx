import { useEffect, useMemo, type CSSProperties } from "react";
import type { LawBook } from "../../../types/law";
import type { LawProgressMap } from "../../../lib/law-progress";
import { buildLessonPath, type PathNode } from "../../../lib/law-path";
import { lessonMeta, semanticChapterTitle } from "./subjectUtils";
import { PrefetchLink } from "../../shared/PrefetchLink";

/** 蜿蜒路径的横向偏移节奏（px），跨章节连续，形成"上下蜿蜒"的关卡感 */
const OFFSETS = [-52, 0, 52, 0];

/**
 * 关卡地图：多邻国式蜿蜒节点路径。
 * 性能约束：一本书最多 600+ 节点，节点必须是普通元素 + CSS 过渡，
 * 严禁给每个节点挂 framer-motion 动画实例。
 */
export function LessonPathMap({
  book,
  progress,
  graphicIds,
}: {
  book: LawBook;
  progress: LawProgressMap;
  graphicIds: Set<string>;
}) {
  const path = useMemo(() => buildLessonPath(book, progress), [book, progress]);

  // 打开地图直接落在当前位置（瞬时定位，长路径不做平滑滚动）
  useEffect(() => {
    document.querySelector(".law-path__node.is-current")?.scrollIntoView({ block: "center" });
  }, []);

  if (path.total === 0) {
    return <p className="law-path__empty">这本书暂时没有可走的路径，去目录视图看看吧。</p>;
  }

  return (
    <div className="law-path" aria-label={`学习路径，共 ${path.total} 站，已完成 ${path.done} 站`}>
      {path.sections.map((section) => {
        const title = semanticChapterTitle(section.chapter);
        return (
          <section
            key={section.chapter.id}
            className="law-path__section"
            aria-label={`${title}（${section.doneCount}/${section.nodes.length}）`}
          >
            <div className={`law-path__divider ${section.isMeta ? "is-meta" : ""}`}>
              <span>{title}</span>
              <small>{section.isMeta ? "书前说明 · 非考点" : `${section.doneCount}/${section.nodes.length}`}</small>
            </div>
            {section.nodes.map((node) => (
              <PathSlot key={node.lesson.id} node={node} isGraphic={graphicIds.has(node.lesson.id)} />
            ))}
          </section>
        );
      })}
      {path.allDone ? (
        <div className="law-path__finish" role="status">
          🎉 这本书的全部站点都走完了！可以回学习中心换下一本。
        </div>
      ) : null}
    </div>
  );
}

function PathSlot({ node, isGraphic }: { node: PathNode; isGraphic: boolean }) {
  const { lesson, order, state } = node;
  const meta = lessonMeta(lesson);
  const isCurrent = state === "current";
  const isDone = state === "done";
  const stateLabel = isDone ? "已完成" : isCurrent ? "当前位置，从这里继续" : "待学习";

  return (
    <div
      className={`law-path__slot ${isCurrent ? "is-here" : ""}`}
      style={{ "--dx": `${OFFSETS[order % OFFSETS.length]}px` } as CSSProperties}
      data-path-current={isCurrent ? "1" : undefined}
    >
      {isCurrent ? <span className="law-path__start" aria-hidden="true">▶ 开始</span> : null}
      <PrefetchLink
        to={`/law/learn/${lesson.id}`}
        className={`law-path__node is-${state}`}
        aria-label={`第 ${order} 站 ${lesson.title}（${stateLabel}，${meta.steps}步约${meta.minutes}分钟）`}
        title={`${lesson.title} · ${meta.steps}步 ≈ ${meta.minutes}分`}
      >
        <b>{isDone ? "✓" : order}</b>
        {node.reviewDue ? <span className="law-path__flag" aria-hidden="true">🔁</span> : null}
        {!node.reviewDue && node.inWrongBook ? <span className="law-path__dot" aria-hidden="true" /> : null}
        {isGraphic ? <span className="law-path__gicon" aria-hidden="true">📐</span> : null}
      </PrefetchLink>
      {isCurrent ? <span className="law-path__here-title">{lesson.title}</span> : null}
    </div>
  );
}
