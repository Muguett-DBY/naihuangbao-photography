import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router";
import { LAW_SUBJECT_MAP } from "../data/law/meta";
import indexUrl from "../data/law/provisions-index.json?url";
import type { LawProvisionEntry, LawProvisionsIndex } from "../lib/law-provisions";
import { LawMascot } from "../components/law/LawMascot";
import { useLawImmersive } from "../components/law/EasterEgg";
import "../styles/law-academy.css";
import "../styles/law-index.css";

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; index: LawProvisionsIndex };

/** 展开态的行键（法名+条号+款号 唯一确定一个条目） */
function rowKey(entry: LawProvisionEntry): string {
  return `${entry.law}|${entry.article}|${entry.clause ?? ""}`;
}

/** 条号搜索词：抽掉"第/条/款"后按数字与展示串匹配（"第143条""143""383之1"都能搜到） */
function articleMatches(entry: LawProvisionEntry, query: string, digits: string): boolean {
  if (!entry.article) return false;
  if (digits && entry.articleNumber !== null && String(entry.articleNumber) === digits) return true;
  return entry.article.includes(query) || (entry.clause !== null && entry.clause === query);
}

interface LawGroup {
  law: string;
  provisions: LawProvisionEntry[];
  references: number;
}

/** 按法律分组：组内引用次数降序（同数按法名码点序，稳定） */
function groupProvisions(provisions: LawProvisionEntry[]): LawGroup[] {
  const groups = new Map<string, LawGroup>();
  for (const entry of provisions) {
    let group = groups.get(entry.law);
    if (!group) {
      group = { law: entry.law, provisions: [], references: 0 };
      groups.set(entry.law, group);
    }
    group.provisions.push(entry);
    group.references += entry.count;
  }
  return [...groups.values()].sort((a, b) => {
    if (a.provisions.length !== b.provisions.length) return b.provisions.length - a.provisions.length;
    return a.law < b.law ? -1 : 1;
  });
}

export function LawProvisionsPage() {
  useLawImmersive();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [attempt, setAttempt] = useState(0);
  const targetRef = useRef<HTMLLIElement | null>(null);

  // 索引懒加载：?url 发成哈希静态资源，fetch 拿到再渲染（不进路由 chunk）
  useEffect(() => {
    let cancelled = false;
    setState({ phase: "loading" });
    fetch(indexUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<LawProvisionsIndex>;
      })
      .then((index) => {
        if (!cancelled) setState({ phase: "ready", index });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setState({ phase: "error", message: cause instanceof Error ? cause.message : String(cause) });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const lawParam = searchParams.get("law");
  const articleParam = searchParams.get("article");

  // 深链定位（T3 的原文法条跳过来）：预填搜索词过滤到该法；
  // 带条号时再展开目标条（含同条号各款）并滚动到位——仅法名深链只过滤不展开
  useEffect(() => {
    if (state.phase !== "ready" || !lawParam) return;
    setQuery(articleParam ? `${lawParam} ${articleParam}` : lawParam);
    if (!articleParam) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const entry of state.index.provisions) {
        if (entry.law === lawParam && entry.article === articleParam) next.add(rowKey(entry));
      }
      return next;
    });
    const timer = window.setTimeout(() => {
      targetRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [state, lawParam, articleParam]);

  const lawCount = useMemo(
    () => (state.phase === "ready" ? new Set(state.index.provisions.map((p) => p.law)).size : 0),
    [state],
  );

  const groups = useMemo(() => {
    if (state.phase !== "ready") return [];
    const keyword = query.trim();
    if (!keyword) return groupProvisions(state.index.provisions);
    const digits = keyword.replace(/\D/g, "");
    const lowered = keyword.toLowerCase();
    const matched = state.index.provisions.filter(
      (entry) => entry.law.toLowerCase().includes(lowered) || articleMatches(entry, keyword, digits),
    );
    return groupProvisions(matched);
  }, [state, query]);

  // 搜索词变化即退出深链定位态（用户开始自己的检索，不再锁定旧目标）
  const locatedRef = useRef(false);
  useEffect(() => {
    locatedRef.current = false;
  }, [query]);

  function toggleRow(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="law-academy law-provisions">
      <header className="law-provisions__head">
        <Link to="/law" className="law-provisions__back">← 学习中心</Link>
        <h1>📖 法条检索</h1>
        <p className="law-provisions__lead">
          五本书里引用过的每一部法律、每一个条号，都串成了索引——点开就能跳去讲它的课。
        </p>
      </header>

      {state.phase === "loading" ? (
        <p className="law-provisions__status" role="status" aria-live="polite">
          正在翻开法条索引……
        </p>
      ) : null}

      {state.phase === "error" ? (
        <div className="law-provisions__empty" role="alert">
          <LawMascot mood="oops" size={88} />
          <h2>法条索引没打开</h2>
          <p>加载失败了（{state.message}）。</p>
          <button type="button" className="law-provisions__retry" onClick={() => setAttempt((n) => n + 1)}>
            重试
          </button>
        </div>
      ) : null}

      {state.phase === "ready" ? (
        <>
          <section className="law-provisions__cards" aria-label="索引统计">
            <div className="law-provisions__kpi">
              <b>{state.index.totalProvisions}</b>
              <span>法条条目</span>
            </div>
            <div className="law-provisions__kpi">
              <b>{lawCount}</b>
              <span>涉及法律</span>
            </div>
            <div className="law-provisions__kpi">
              <b>{state.index.totalReferences}</b>
              <span>课本引用次数</span>
            </div>
          </section>

          <div className="law-search law-provisions__search">
            <div className="law-search__box">
              <span aria-hidden="true">🔍</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="输入法律名（如 民法典）或条号（如 143）"
                aria-label="按法律名或条号搜索"
              />
              {query ? (
                <button
                  type="button"
                  className="law-search__clear"
                  onClick={() => setQuery("")}
                  aria-label="清空搜索"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="law-provisions__empty" aria-live="polite">
              <LawMascot mood="think" size={88} />
              <h2>{query ? `没有找到「${query.trim()}」相关的法条` : "索引里还没有法条"}</h2>
              <p>
                {query
                  ? "换个法律名试试：民法典、刑法、宪法、立法法……"
                  : "先跑一次 npm run law:provisions 生成索引。"}
              </p>
            </div>
          ) : (
            <>
              <p className="law-provisions__count" role="status" aria-live="polite">
                {groups.length} 部法律 · {groups.reduce((sum, g) => sum + g.provisions.length, 0)} 个条目
              </p>
              {groups.map((group) => (
                <section key={group.law} className="law-provisions__group" aria-label={`《${group.law}》条目`}>
                  <h2 className="law-provisions__group-head">
                    《{group.law}》
                    <small>
                      {group.provisions.length} 条 · 引用 {group.references} 次
                    </small>
                  </h2>
                  <ul className="law-provisions__list">
                    {group.provisions.map((entry) => {
                      const key = rowKey(entry);
                      const isTarget =
                        articleParam !== null && lawParam === entry.law && entry.article === articleParam;
                      const isOpen = expanded.has(key);
                      return (
                        <li
                          key={key}
                          ref={isTarget && !locatedRef.current ? targetRef : undefined}
                          className={`law-provisions__row ${isTarget ? "is-target" : ""}`}
                        >
                          <button
                            type="button"
                            className="law-provisions__row-btn"
                            aria-expanded={isOpen}
                            aria-controls={`prov-${key.replace(/[|\s]/g, "-")}`}
                            onClick={() => {
                              toggleRow(key);
                              locatedRef.current = true;
                            }}
                          >
                            <span className="law-provisions__article">
                              {entry.article ? (
                                <>
                                  第{entry.article}条
                                  {entry.clause !== null ? <small>第{entry.clause}款</small> : null}
                                </>
                              ) : (
                                <em>（仅提及法律名）</em>
                              )}
                            </span>
                            <span className="law-provisions__meta">
                              <b>{entry.count}</b> 次引用 · <b>{entry.lessons.length}</b> 个课时
                              <span className="law-provisions__chevron" aria-hidden="true">
                                {isOpen ? "▲" : "▼"}
                              </span>
                            </span>
                          </button>
                          {isOpen ? (
                            <ul id={`prov-${key.replace(/[|\s]/g, "-")}`} className="law-provisions__lessons">
                              {entry.lessons.map((lesson) => {
                                const subject = LAW_SUBJECT_MAP[lesson.subject];
                                return (
                                  <li key={lesson.lessonId}>
                                    <Link
                                      to={`/law/learn/${lesson.lessonId}`}
                                      className="law-provisions__lesson"
                                      style={
                                        { "--law-accent": subject.accent, "--law-accent-soft": subject.accentSoft } as CSSProperties
                                      }
                                    >
                                      <span aria-hidden="true">{subject.emoji}</span>
                                      {lesson.title}
                                      <small>{subject.name}</small>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
