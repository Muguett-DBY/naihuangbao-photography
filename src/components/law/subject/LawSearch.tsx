import { useEffect, useMemo, useState } from "react";
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

/** 学科内全文搜索：标题 + 原文正文；输入防抖 160ms，结果片段高亮关键词 */
export function LawSearch({ book, onPick }: { book: LawBook; onPick: (lessonId: string) => void }) {
  const [query, setQuery] = useState("");
  // 防抖：全书 500+ 课的 raw 逐字扫描不该跟手逐键触发
  const [debounced, setDebounced] = useState("");
  const subject = LAW_SUBJECT_MAP[book.id];

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 160);
    return () => window.clearTimeout(timer);
  }, [query]);

  const hits = useMemo<SearchHit[]>(() => {
    const keyword = debounced.trim();
    if (keyword.length < 2) return [];
    const result: SearchHit[] = [];
    for (const chapter of book.chapters) {
      // 附录章（考点索引）不进搜索——那是索引页不是知识点
      if (chapter.appendix) continue;
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
        const raw = lesson.raw.join("；");
        const index = raw.indexOf(keyword);
        if (index >= 0) {
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
    // 依赖 debounced（防抖后的关键词）而不是 query——否则防抖更新时结果不重算，
    // 搜索会永远停在"没有找到"（e2e 回归：根本制度用例抓到）
  }, [book, debounced]);

  const active = debounced.trim().length >= 2;
  const keyword = debounced.trim();

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
            <p className="law-search__empty">没有找到" {keyword} "，换个关键词试试（或用"原文对照"浏览全书）</p>
          ) : (
            <ul>
              {hits.map((hit) => (
                <li key={hit.lesson.id}>
                  <button type="button" onClick={() => onPick(hit.lesson.id)}>
                    <span className="law-search__tag">{hit.source === "title" ? "📌 标题" : "📄 正文"}</span>
                    <span className="law-search__hit-title">
                      <b>{highlight(hit.lesson.title, keyword)}</b>
                      <small>{hit.chapter}</small>
                    </span>
                    <span className="law-search__snippet">{highlight(hit.snippet, keyword)}</span>
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

/** 关键词高亮：命中片段包 <mark>，找不到就不加样式（正则转义防注入） */
function highlight(text: string, keyword: string) {
  if (!keyword) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "g"));
  return parts.map((part, index) =>
    part === keyword ? <mark key={index}>{part}</mark> : <span key={index}>{part}</span>,
  );
}
