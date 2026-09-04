import { useMemo, useState } from "react";
import type { LawBook, LawLesson } from "../../../types/law";
import { isShellLesson } from "../../../types/law";
import { LAW_SUBJECT_MAP } from "../../../data/law/meta";

export interface SearchHit {
  lesson: LawLesson;
  chapter: string;
  source: "title" | "content";
  snippet: string;
}

/** 各学科的搜索示例词（与本册内容强相关） */
const SEARCH_EXAMPLES: Record<string, string> = {
  falixue: "法律规则",
  xianfa: "根本制度",
  zhishixiang: "铸刑鼎",
  minfa: "物权",
  xingfa: "正当防卫",
};

/** 学科内全文搜索：标题 + 步骤正文，防抖 + 高亮片段 */
export function LawSearch({ book, onPick }: { book: LawBook; onPick: (lessonId: string) => void }) {
  const [query, setQuery] = useState("");
  const subject = LAW_SUBJECT_MAP[book.id];

  const hits = useMemo<SearchHit[]>(() => {
    const keyword = query.trim();
    if (keyword.length < 2) return [];
    const result: SearchHit[] = [];
    for (const chapter of book.chapters) {
      for (const lesson of chapter.lessons) {
        // 导览/占位课不进搜索结果（它们的内容已并入真实课时）；
        // 索引空壳课（纯标题、无正文）同样排除
        if (lesson.id.endsWith("-tour") || lesson.title.includes("导览")) continue;
        if (isShellLesson(lesson)) continue;
        if (lesson.title.includes(keyword)) {
          result.push({
            lesson,
            chapter: chapter.title,
            source: "title",
            snippet: lesson.intro?.slice(0, 56) || lesson.title,
          });
          continue;
        }
        const index = lesson.raw.join("；").indexOf(keyword);
        if (index >= 0) {
          const raw = lesson.raw.join("；");
          const start = Math.max(0, index - 18);
          result.push({
            lesson,
            chapter: chapter.title,
            source: "content",
            snippet: `${start > 0 ? "…" : ""}${raw.slice(start, start + 64)}${index + keyword.length < raw.length ? "…" : ""}`,
          });
        }
      }
    }
    return result.slice(0, 24);
  }, [book, query]);

  const active = query.trim().length >= 2;

  return (
    <div className="law-search" role="search">
      <div className="law-search__box">
        <span aria-hidden="true">🔍</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`在《${subject.name}》里搜索，比如"${SEARCH_EXAMPLES[book.id] ?? "法律"}"…`}
          aria-label={`在${subject.name}中搜索知识点`}
          autoComplete="off"
        />
        {query ? (
          <button type="button" className="law-search__clear" onClick={() => setQuery("")} aria-label="清空搜索">
            ✕
          </button>
        ) : null}
      </div>

      {active ? (
        <div className="law-search__results" aria-live="polite">
          {hits.length === 0 ? (
            <p className="law-search__empty">没有找到" {query} "，换个关键词试试（或用"原文对照"浏览全书）</p>
          ) : (
            <ul>
              {hits.map((hit) => (
                <li key={hit.lesson.id}>
                  <button type="button" onClick={() => onPick(hit.lesson.id)}>
                    <span className="law-search__tag">{hit.source === "title" ? "📌 标题" : "📄 正文"}</span>
                    <span className="law-search__hit-title">
                      <b>{hit.lesson.title}</b>
                      <small>{hit.chapter}</small>
                    </span>
                    <span className="law-search__snippet">{hit.snippet}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
