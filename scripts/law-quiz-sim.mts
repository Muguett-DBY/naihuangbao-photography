// 出题仿真回归套件：全库跑 buildQuiz，输出题型分布/选项数分布/否题占比/闸门拦截数，
// 与入库基线对比；质量指标倒退即非零退出。--update 重写基线（引擎有意改动后使用）。
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildQuiz } from "../src/lib/law-quiz";
import { isGarbledOrderPart } from "../src/lib/law-quiz-gates";
import { confusablesOf } from "../src/lib/law-confusion";
import { isCleanTerm, isShellLesson, type LawBook, type LawLesson, type LawQuizItem } from "../src/types/law";

const root = resolve(import.meta.dirname, "..");
const BASELINE_PATH = resolve(root, "scripts/law-quizsim-baseline.json");
const UPDATE = process.argv.includes("--update");

const SUBJECTS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"] as const;
const books: Record<(typeof SUBJECTS)[number], LawBook> = Object.fromEntries(
  SUBJECTS.map((id) => [
    id,
    JSON.parse(readFileSync(resolve(root, `src/data/law/${id}.json`), "utf8")).book as LawBook,
  ]),
) as Record<(typeof SUBJECTS)[number], LawBook>;

/** 与 loader.collectSiblingTerms 同语义（loader 顶层 import.meta.glob 无法在 node 下导入，此处复刻） */
function siblingTermsOf(book: LawBook, lessonId: string): string[] {
  const terms: string[] = [];
  for (const chapter of book.chapters) {
    if (!chapter.lessons.some((lesson) => lesson.id === lessonId)) continue;
    for (const lesson of chapter.lessons) {
      if (lesson.id === lessonId) continue;
      for (const step of lesson.steps) {
        for (const term of step.terms ?? []) {
          const cleaned = term.term?.trim().replace(/^[（(【[]|[）)】\]]$/g, "").trim();
          if (cleaned && isCleanTerm(cleaned) && !terms.includes(cleaned)) terms.push(cleaned);
        }
        if (terms.length >= 40) break;
      }
      if (terms.length >= 40) break;
    }
    break;
  }
  return terms.slice(0, 40);
}

const isMetaTitle = (title: string) => /^(作者的话|使用说明|序言|前言|后记)$/.test(title.trim());
const allLessons: LawLesson[] = Object.values(books).flatMap((book) => book.chapters.flatMap((c) => c.lessons));
const teaching = allLessons.filter(
  (lesson) => !isShellLesson(lesson) && !lesson.id.endsWith("-tour") && !isMetaTitle(lesson.title),
);

// 一次构建全库题目（拦截推导复用，避免二次生成）
const builtByLesson = new Map<string, LawQuizItem[]>();
for (const lesson of teaching) {
  builtByLesson.set(lesson.id, buildQuiz(lesson, siblingTermsOf(books[lesson.subject], lesson.id)));
}

const kindCount: Record<string, number> = { mcq: 0, order: 0, judge: 0, fill: 0, multi: 0 };
const optionDist: Record<string, number> = {};
const orderCardDist: Record<string, number> = {};
const multiCorrectDist: Record<string, number> = {};
let judgeYes = 0;
let judgeNo = 0;
let covered = 0;
let maxPrompt = 0;
let dupPrompt = 0; // 课内重复题面（引擎 usedPrompts 闸门的独立复核）
// 结构合法性（倒退即失败）
let missingAnswerOption = 0; // mcq 选项里没有答案
let ambiguousDistractors = 0; // 干扰项出现在题面
let answerVisible = 0; // 答案出现在题面（mcq/fill/multi 正确项可见）
let answerNotFromLesson = 0; // 答案不在本课正文
let garbledOrderCards = 0;
let truncatedPrompts = 0; // 题面以连接词/助词截断
let multiCorrectBelow3 = 0;
let multiDistractorInLesson = 0; // 多选干扰项出现在本课正文（歧义：本课也讲过）
// T5 干扰项质量：混淆对命中率与字符相似度（迷惑性代理）
let mcqDistractorTotal = 0;
let mcqConfusionHits = 0;
let diceSum = 0;
let diceCount = 0;

function bigramsOf(term: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < term.length - 1; i += 1) set.add(term.slice(i, i + 2));
  return set;
}

function dice(a: string, b: string): number {
  const ga = bigramsOf(a);
  const gb = bigramsOf(b);
  let common = 0;
  for (const g of ga) if (gb.has(g)) common += 1;
  return common === 0 ? 0 : (2 * common) / (ga.size + gb.size);
}
// 闸门拦截数（推导口径：有原料却未产出 = 被闸门拦下；跨次对比稳定即可）
let orderIntercepted = 0; // 有 ≥3 条编号条目的非粗糙步，但本课无排序题
let judgeMutIntercepted = 0; // 有可变异原料（年份/引号术语句），但未产出"变错"判断题
let defIntercepted = 0; // 有短定义句，但未产出定义挖空题

function bump(map: Record<string, number>, key: number | string) {
  map[String(key)] = (map[String(key)] ?? 0) + 1;
}

for (const lesson of teaching) {
  const items = builtByLesson.get(lesson.id) ?? [];
  if (items.length > 0) covered += 1;
  const lessonText = lesson.steps.map((s) => s.text).join("") + lesson.raw.join("");
  const lessonPrompts = new Set<string>();
  for (const item of items) {
    kindCount[item.kind] = (kindCount[item.kind] ?? 0) + 1;
    maxPrompt = Math.max(maxPrompt, item.prompt.length);
    if (lessonPrompts.has(item.prompt)) dupPrompt += 1;
    lessonPrompts.add(item.prompt);
    if (/[联的与和或及在是对为把被从而并按据向于变受]$/.test(item.prompt.replace(/[」：:）]$/, ""))) {
      truncatedPrompts += 1;
    }
    if (item.kind === "mcq" || item.kind === "multi") {
      bump(optionDist, (item.options ?? []).length);
      if (item.kind === "mcq" && !(item.options ?? []).includes(item.answer)) missingAnswerOption += 1;
      for (const option of item.options ?? []) {
        if (option !== item.answer && item.prompt.includes(option)) ambiguousDistractors += 1;
      }
      if (item.kind === "mcq") {
        const hits = confusablesOf(item.answer);
        for (const option of item.options ?? []) {
          if (option === item.answer) continue;
          mcqDistractorTotal += 1;
          if (hits.includes(option)) mcqConfusionHits += 1;
          diceSum += dice(item.answer, option);
          diceCount += 1;
        }
      }
    }
    if (item.kind === "mcq" || item.kind === "fill") {
      if (item.prompt.includes(item.answer)) answerVisible += 1;
      if (!lessonText.includes(item.answer)) answerNotFromLesson += 1;
    }
    if (item.kind === "order") {
      bump(orderCardDist, (item.order ?? []).length);
      for (const card of item.order ?? []) if (isGarbledOrderPart(card)) garbledOrderCards += 1;
    }
    if (item.kind === "judge") {
      if (item.answer === "是") judgeYes += 1;
      else judgeNo += 1;
    }
    if (item.kind === "multi") {
      const correct = item.multi ?? item.answer.split("、");
      bump(multiCorrectDist, correct.length);
      if (correct.length < 3) multiCorrectBelow3 += 1;
      const correctSet = new Set(correct);
      for (const option of item.options ?? []) {
        if (!correctSet.has(option) && lessonText.includes(option)) multiDistractorInLesson += 1;
      }
    }
  }
  // 闸门拦截推导
  const hasOrderMaterial = lesson.steps.some(
    (step) =>
      !step.rough &&
      (step.parts ?? []).filter((p) => /^[①②③④⑤⑥⑦⑧⑨⑩]|^\d{1,2}[.、．]|^[（(][一二三四五六七八九十]{1,4}[)）]/.test(p)).length >= 3,
  );
  if (hasOrderMaterial && !items.some((item) => item.kind === "order")) orderIntercepted += 1;
  if (lesson.steps.some((s) => /\d{2,4}年|[“"「《]/.test(s.text)) && !items.some((item) => item.kind === "judge" && item.answer === "否"))
    judgeMutIntercepted += 1;
  if (lesson.steps.some((s) => s.text.length <= 90) && !items.some((item) => item.prompt.includes("＿＿＿"))) defIntercepted += 1;
}

const judgeTotal = judgeYes + judgeNo;
const metrics = {
  generatedAt: new Date().toISOString(),
  teachingLessons: teaching.length,
  coverage: +(covered / Math.max(teaching.length, 1)).toFixed(4),
  kindCount,
  judge: { total: judgeTotal, yes: judgeYes, no: judgeNo, noRatio: +(judgeNo / Math.max(judgeTotal, 1)).toFixed(4) },
  optionDist,
  orderCardDist,
  multiCorrectDist,
  distractor: {
    mcqTotal: mcqDistractorTotal,
    confusionHits: mcqConfusionHits,
    confusionHitRate: +(mcqConfusionHits / Math.max(mcqDistractorTotal, 1)).toFixed(4),
    avgDice: +(diceSum / Math.max(diceCount, 1)).toFixed(4),
  },
  quality: {
    ambiguousDistractors,
    answerVisible,
    answerNotFromLesson,
    garbledOrderCards,
    truncatedPrompts,
    dupPrompt,
    missingAnswerOption,
    multiCorrectBelow3,
    multiDistractorInLesson,
    maxPrompt,
  },
  intercepted: { orderIntercepted, defIntercepted, judgeMutIntercepted },
};

const order2 = (pairs: [string, unknown][]) => Object.fromEntries(pairs.sort((a, b) => a[0].localeCompare(b[0])));
const display = {
  ...metrics,
  optionDist: order2(Object.entries(metrics.optionDist)),
  orderCardDist: order2(Object.entries(metrics.orderCardDist)),
  multiCorrectDist: order2(Object.entries(metrics.multiCorrectDist)),
};

console.log("── 法考出题仿真报告 ──");
console.log(JSON.stringify(display, null, 2));

// ── 质量红线（与任务书基线一致）：倒退即失败 ──
const failures: string[] = [];
const q = metrics.quality;
const expect0 = (name: string, value: number) => {
  if (value > 0) failures.push(`${name} = ${value}（必须为 0）`);
};
expect0("歧义干扰项（题面可见）", q.ambiguousDistractors);
expect0("答案在题面可见", q.answerVisible);
expect0("mcq 选项缺答案", q.missingAnswerOption);
expect0("答案不在本课正文", q.answerNotFromLesson);
expect0("排序乱码卡", q.garbledOrderCards);
expect0("截断题面", q.truncatedPrompts);
expect0("课内重复题面", q.dupPrompt);
expect0("多选正确项<3", q.multiCorrectBelow3);
expect0("多选干扰项在本课正文", q.multiDistractorInLesson);
if (metrics.judge.noRatio < 0.15) failures.push(`判断题"否"占比 ${(metrics.judge.noRatio * 100).toFixed(1)}% < 15%`);
if (metrics.coverage < 0.8) failures.push(`覆盖率 ${(metrics.coverage * 100).toFixed(1)}% < 80%`);
if (q.maxPrompt > 120) failures.push(`最长题面 ${q.maxPrompt} > 120`);

// ── 基线对比（结构性指标漂移：降幅 >10% 视为倒退，增幅只提示）──
let baseline: typeof metrics | null = null;
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
} catch {
  baseline = null;
}
if (UPDATE || !baseline) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify(display, null, 2)}\n`);
  console.log(UPDATE ? "✅ 基线已更新（scripts/law-quizsim-baseline.json）" : "✅ 基线不存在，已写入初始基线");
} else {
  const drift = (name: string, value: number, prev: number) => {
    const delta = value - prev;
    if (delta === 0) return;
    const pct = prev === 0 ? (value === 0 ? 0 : Number.POSITIVE_INFINITY) : (delta / prev) * 100;
    const regress = value < prev;
    const line = `${name}: ${prev} → ${value}（${delta > 0 ? "+" : ""}${delta}）`;
    if (regress && pct < -10) failures.push(`指标倒退 ${line}`);
    else console.log(`ℹ️ 指标变化 ${line}`);
  };
  for (const kind of ["mcq", "order", "judge", "fill", "multi"] as const) {
    drift(`${kind} 题量`, metrics.kindCount[kind] ?? 0, baseline.kindCount[kind] ?? 0);
  }
  if (metrics.judge.noRatio < baseline.judge.noRatio - 0.01)
    failures.push(`判断"否"占比倒退：${baseline.judge.noRatio} → ${metrics.judge.noRatio}`);
  if (metrics.coverage < baseline.coverage - 0.005)
    failures.push(`覆盖率倒退：${baseline.coverage} → ${metrics.coverage}`);
  if (baseline.distractor && metrics.distractor.avgDice < baseline.distractor.avgDice - 0.02)
    failures.push(`干扰项迷惑性（avgDice）倒退：${baseline.distractor.avgDice} → ${metrics.distractor.avgDice}`);
}

if (failures.length > 0) {
  console.error("\n❌ 出题仿真回归失败：");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\n✅ 出题仿真通过：质量红线全绿" + (baseline && !UPDATE ? "，基线对比无倒退" : ""));
