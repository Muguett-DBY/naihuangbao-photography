/**
 * 法条检索与知识点关联 · 法条提取引擎（P4）
 *
 * 从五本书的课时正文（steps 文本域 + raw 原文行）里提取法条引用：
 *   模式1：《法律名》第X条 / 第X条之Y / 第X条第Z款（中文数字与阿拉伯数字都认）
 *   模式2：依《法律名》/ 根据/依照/依据/按照《法律名》（无条号，仅记法律名）
 *
 * 纯数据模块：无 DOM、无 React、无 fetch——构建脚本（scripts/build-law-provisions.mjs，
 * 经 tsx 加载本模块）与页面侧（原文面板高亮）共用同一套正则与换算，单源不重复。
 */

import type { LawBook, LawLesson, LawSubjectId } from "../types/law";

/** 法律名主体：书名号内 2-24 个非书名号、非换行字符 */
const LAW_NAME_BODY = "[^《》\\n]{2,24}";
/** 中文数字或阿拉伯数字的条/款号 */
const CN_NUM = "[一二三四五六七八九十百千零〇两\\d]+";

/**
 * 模式1：《法律名》第X条(之Y)(第Z款)
 * 分组：1=法名 2=条号 3=之Y整体 4=之Y号 5=第Z款整体 6=款号
 */
export const LAW_ARTICLE_PATTERN = new RegExp(
  `《(${LAW_NAME_BODY})》第(${CN_NUM})条(之(${CN_NUM}))?(第(${CN_NUM})款)?`,
  "g",
);

/** 省略主语的连续条号（"《立法法》第11条和第12条"的后半）：连接词 + 第X条(之Y)(第Z款) */
export const LAW_ELIDED_ARTICLE_PATTERN = new RegExp(
  `[和、及与]第(${CN_NUM})条(之(${CN_NUM}))?(第(${CN_NUM})款)?`,
  "g",
);

/** 模式2：依/根据/依照/依据/按照《法律名》——无条号引用 */
export const LAW_NAME_REF_PATTERN = new RegExp(`(?:依|依照|依据|根据|按照)《(${LAW_NAME_BODY})》`, "g");

const CN_DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const CN_UNITS: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };

/** 中文数字 → 阿拉伯数字（"一百四十三"→143、"十四"→14、"205"/"二百零五"→205）；认不出的返回 null */
export function cnNumberToNumber(input: string): number | null {
  const text = input.trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number(text);

  let total = 0;
  let section = 0; // 千位段内累计（万以上条号不存在，不设万位）
  let digit = 0;
  let sawCn = false;
  for (const char of text) {
    const cnDigit = CN_DIGITS[char];
    if (cnDigit !== undefined) {
      digit = cnDigit;
      sawCn = true;
    } else if (char in CN_UNITS) {
      const unit = CN_UNITS[char];
      section += (digit || 1) * unit; // "十"=10、"二十"=20：无数字时按 1
      digit = 0;
      sawCn = true;
    } else {
      return null; // 混入非数字字符（OCR 噪声）——整串不认
    }
  }
  if (!sawCn) return null;
  return total + section + digit;
}

/** OCR 残留书名号/空白清洗；判为噪声（清洗后 <2 字、仍含书名号、带括号）返回 null */
export function normalizeLawName(raw: string): string | null {
  const cleaned = raw
    .replace(/[\s\u3000]+/g, "")
    .replace(/^[《》〔〕【】\[\]""''"]+/, "")
    .replace(/[《》〔〕【】\[\]""''''"]+$/, "")
    .trim();
  if (cleaned.length < 2) return null;
  if (/[《》〔〕【】\[\]/]/.test(cleaned)) return null;
  if (/[（）()]/.test(cleaned)) return null;
  return cleaned;
}

/** 一条法条引用（模式1 带条/款号，模式2 仅法律名） */
export interface LawProvisionRef {
  /** 清洗后的法律名 */
  law: string;
  /** 条号展示串（规范化阿拉伯，如 "143"、"383之1"）；模式2 为空串 */
  article: string;
  /** 款号展示串（如 "2"）；无款或模式2 为 null */
  clause: string | null;
  /** 条号数值（排序用）；模式2 为 null */
  articleNumber: number | null;
  /** "之Y" 的 Y 数值；无之Y 为 null */
  suffixNumber: number | null;
  /** 款号数值；无款为 null */
  clauseNumber: number | null;
  /** 在源文本中的位置（高亮分词用） */
  start: number;
  end: number;
}

function normalizeNum(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const value = cnNumberToNumber(raw);
  return value === null || !Number.isFinite(value) ? null : value;
}

function displayNumber(value: number | null): string | null {
  return value === null ? null : String(value);
}

function refFromMatch(
  law: string,
  match: RegExpMatchArray,
  articleGroup: number,
  suffixGroup: number,
  clauseGroup: number,
  offset: number,
): LawProvisionRef | null {
  const articleNumber = normalizeNum(match[articleGroup]);
  if (articleNumber === null) return null;
  const suffixNumber = normalizeNum(match[suffixGroup]);
  const clauseNumber = normalizeNum(match[clauseGroup]);
  const suffix = suffixNumber === null ? "" : `之${suffixNumber}`;
  return {
    law,
    article: `${articleNumber}${suffix}`,
    clause: displayNumber(clauseNumber),
    articleNumber,
    suffixNumber,
    clauseNumber,
    start: offset,
    end: offset + match[0].length,
  };
}

/** 提取一段文本中的全部法条引用（含位置；模式2 与模式1 重叠时只保留模式1） */
export function parseLawRefs(text: string): LawProvisionRef[] {
  if (!text) return [];
  const refs: LawProvisionRef[] = [];

  LAW_ARTICLE_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(LAW_ARTICLE_PATTERN)) {
    const law = normalizeLawName(match[1]);
    if (!law) continue;
    const ref = refFromMatch(law, match, 2, 4, 6, match.index);
    if (!ref) continue;
    refs.push(ref);

    // 省略主语的连续条号："《立法法》第11条和第12条"——后半沿用同一法名，
    // 只接紧邻的连接词（和/、/及/与），跨过其他文字就停（防误接别的法律的条号）
    let cursor = match.index + match[0].length;
    for (;;) {
      const ahead = text.slice(cursor);
      LAW_ELIDED_ARTICLE_PATTERN.lastIndex = 0;
      const elidedMatch = LAW_ELIDED_ARTICLE_PATTERN.exec(ahead);
      if (!elidedMatch || elidedMatch.index !== 0) break;
      const extra = refFromMatch(law, elidedMatch, 1, 3, 5, cursor);
      if (extra) refs.push(extra);
      cursor += elidedMatch[0].length;
    }
  }

  // 模式2：与任一模式1 命中区间重叠的（"依《刑法》第14条"）不算独立引用
  LAW_NAME_REF_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(LAW_NAME_REF_PATTERN)) {
    const start = match.index;
    const end = start + match[0].length;
    if (refs.some((ref) => start < ref.end && end > ref.start)) continue;
    const law = normalizeLawName(match[1]);
    if (!law) continue;
    refs.push({
      law,
      article: "",
      clause: null,
      articleNumber: null,
      suffixNumber: null,
      clauseNumber: null,
      start,
      end,
    });
  }

  refs.sort((a, b) => a.start - b.start);
  return refs;
}

/** 组合排序键：条号 → 之Y → 款号；无条号（模式2）永远排在该法组末尾 */
export function provisionSortKey(ref: Pick<LawProvisionRef, "articleNumber" | "suffixNumber" | "clauseNumber">): number {
  if (ref.articleNumber === null) return Number.MAX_SAFE_INTEGER;
  return ref.articleNumber * 1_000_000 + (ref.suffixNumber ?? 0) * 1_000 + (ref.clauseNumber ?? 0);
}

/** 法条检索页深链：/law/provisions?law=X&article=Y（模式2 只带 law） */
export function provisionHref(law: string, article: string): string {
  const params = new URLSearchParams({ law });
  if (article) params.set("article", article);
  return `/law/provisions?${params.toString()}`;
}

/** 高亮分词：文本切成普通文本段与法条引用段，供原文面板渲染成可点链接 */
export type LawRefToken = { type: "text"; text: string } | { type: "ref"; ref: LawProvisionRef; text: string };

export function splitLawRefTokens(text: string): LawRefToken[] {
  const refs = parseLawRefs(text);
  if (refs.length === 0) return [{ type: "text", text }];
  const tokens: LawRefToken[] = [];
  let cursor = 0;
  for (const ref of refs) {
    if (ref.start > cursor) tokens.push({ type: "text", text: text.slice(cursor, ref.start) });
    tokens.push({ type: "ref", ref, text: text.slice(ref.start, ref.end) });
    cursor = ref.end;
  }
  if (cursor < text.length) tokens.push({ type: "text", text: text.slice(cursor) });
  return tokens;
}

/* ── 索引构建 ── */

export interface LawProvisionLessonRef {
  subject: LawSubjectId;
  lessonId: string;
  title: string;
}

/** 索引条目：JSON 产物 provisions[] 的元素（键 = 法律名+条号+款号） */
export interface LawProvisionEntry {
  law: string;
  /** 规范化条号（"143"、"383之1"）；模式2（仅法律名）为空串 */
  article: string;
  clause: string | null;
  /** 条号数值（页面排序用）；模式2 为 null */
  articleNumber: number | null;
  /** 引用该法条的课时（跨课去重，按书序） */
  lessons: LawProvisionLessonRef[];
  /** 引用次数（全部扫描文本域中的命中总次数） */
  count: number;
}

export interface LawProvisionsIndex {
  provisions: LawProvisionEntry[];
  totalProvisions: number;
  totalReferences: number;
}

interface AggregatedEntry extends LawProvisionEntry {
  sortKey: number;
  lessonSeen: Set<string>;
}

/** 课时内全部待扫描文本域：正文步、列表项、口诀、时间线、对比、转折 + 原文保底行 */
export function collectLessonTexts(lesson: LawLesson): string[] {
  const texts: string[] = [];
  for (const rawLine of lesson.raw) texts.push(rawLine);
  for (const step of lesson.steps) {
    if (step.text) texts.push(step.text);
    for (const part of step.parts ?? []) if (part) texts.push(part);
    if (step.mnemonic) texts.push(step.mnemonic);
    if (step.pivot) {
      if (step.pivot.rule) texts.push(step.pivot.rule);
      if (step.pivot.except) texts.push(step.pivot.except);
    }
    for (const point of step.timeline ?? []) if (point.what) texts.push(point.what);
    for (const same of step.compare?.same ?? []) if (same) texts.push(same);
    for (const diff of step.compare?.diff ?? []) {
      if (diff.a) texts.push(diff.a);
      if (diff.b) texts.push(diff.b);
    }
  }
  if (lesson.mnemonic) texts.push(lesson.mnemonic);
  return texts;
}

/**
 * 从若干本书构建法条索引。
 * 幂等且确定性：同一份输入永远产出同一份排序稳定的输出（law 码点序 → 条号 → 之Y → 款号）。
 */
export function buildProvisionsIndex(books: { subject: LawSubjectId; book: LawBook }[]): LawProvisionsIndex {
  const aggregated = new Map<string, AggregatedEntry>();
  let totalReferences = 0;

  for (const { subject, book } of books) {
    for (const chapter of book.chapters) {
      for (const lesson of chapter.lessons) {
        for (const text of collectLessonTexts(lesson)) {
          for (const ref of parseLawRefs(text)) {
            totalReferences += 1;
            const key = `${ref.law}\u0000${ref.article}\u0000${ref.clause ?? ""}`;
            let entry = aggregated.get(key);
            if (!entry) {
              entry = {
                law: ref.law,
                article: ref.article,
                clause: ref.clause,
                articleNumber: ref.articleNumber,
                lessons: [],
                count: 0,
                sortKey: provisionSortKey(ref),
                lessonSeen: new Set(),
              };
              aggregated.set(key, entry);
            }
            entry.count += 1;
            if (!entry.lessonSeen.has(lesson.id)) {
              entry.lessonSeen.add(lesson.id);
              entry.lessons.push({ subject, lessonId: lesson.id, title: lesson.title });
            }
          }
        }
      }
    }
  }

  const provisions = [...aggregated.values()]
    .sort((a, b) => {
      if (a.law !== b.law) return a.law < b.law ? -1 : 1;
      return a.sortKey - b.sortKey;
    })
    .map(({ lessonSeen: _seen, sortKey: _sortKey, ...entry }) => entry);

  return { provisions, totalProvisions: provisions.length, totalReferences };
}
