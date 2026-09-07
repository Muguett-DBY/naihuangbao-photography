import { useEffect, useState } from "react";
import { loadLawFlowStats } from "../../data/law/loader";
import { getLawProgress } from "../../lib/law-progress";
import type { LawSubjectId } from "../../types/law";

export interface LawFinishCandidate {
  id: LawSubjectId;
  name: string;
  emoji: string;
  done: number;
  total: number;
}

interface FinishedBook extends LawFinishCandidate {}

/**
 * 单书通关庆祝横幅（学习中心页脚区域）。
 * 候选来自页面现成的 stats 口径 done/total，再用 meta 级 loadLawFlowStats 精确复核
 * （与 buildLessonPath 同口径：非附录章 + 非空壳课），避免误报"已通"。
 * 节点逐个点亮为纯 CSS 动画，prefers-reduced-motion 时直接全亮。
 */
export function LawFinishBanner({ subjects }: { subjects: LawFinishCandidate[] }) {
  const [finished, setFinished] = useState<FinishedBook[]>([]);

  useEffect(() => {
    let cancelled = false;
    const candidates = subjects.filter((s) => s.total > 0 && s.done >= s.total);
    if (candidates.length === 0) {
      setFinished([]);
      return;
    }
    Promise.all(
      candidates.map(async (subject) => {
        try {
          const stats = await loadLawFlowStats(subject.id, getLawProgress());
          return stats.total > 0 && stats.done >= stats.total
            ? { ...subject, done: stats.done, total: stats.total }
            : null;
        } catch {
          return null;
        }
      }),
    ).then((books) => {
      if (!cancelled) setFinished(books.filter((book): book is FinishedBook => book !== null));
    });
    return () => {
      cancelled = true;
    };
  }, [subjects]);

  if (finished.length === 0) return null;

  return (
    <section className="law-finish-banner" aria-label="通关庆祝">
      {finished.map((book) => (
        <div key={book.id} className="law-finish-banner__card" role="status">
          <div className="law-finish-banner__dots" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => (
              <span
                key={index}
                className="law-finish-banner__dot"
                style={{ animationDelay: `${index * 0.14}s` }}
              />
            ))}
          </div>
          <p className="law-finish-banner__title">
            {book.emoji} 《{book.name}》已通！
          </p>
          <p className="law-finish-banner__sub">
            {book.total} 个知识点全部掌握 —— 一整本书，被你一页一页走完了 🎓
          </p>
        </div>
      ))}
    </section>
  );
}
