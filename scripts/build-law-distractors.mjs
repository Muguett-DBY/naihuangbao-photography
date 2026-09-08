// T5 干扰项质量库构建：聚合五本教材"同章高频混淆对"。
// 口径：章内术语集合（step.terms + 正文引号术语 + 定义句首概念）两两配对，
// 按字符二元组 Dice 相似度排序（"民事权利能力"vs"民事行为能力"共享"民事/能力"），
// 每词保留 top-4（≥0.25），输出 src/lib/law-confusion-data.ts（运行时干扰项优选依据）。
// 重新生成：npm run law:distractors（数据 JSON 变更后跑一次）。
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const SUBJECTS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"];

const CLEAN = /^[一-龥]{2,12}$/;

/** 与出题引擎同口径的取材：step.terms 清洗 + 正文引号术语 + 定义句首概念 */
function termsOfLesson(lesson) {
  const terms = new Set();
  for (const step of lesson.steps ?? []) {
    for (const t of step.terms ?? []) {
      const cleaned = t.term?.trim().replace(/^[（(【[]|[）)】\]]$/g, "").trim();
      if (cleaned && CLEAN.test(cleaned)) terms.add(cleaned);
    }
    for (const quoted of step.text?.matchAll(/["“「《]([^"”」》]{2,12})["”」》]/g) ?? []) {
      if (CLEAN.test(quoted[1])) terms.add(quoted[1]);
    }
    for (const def of step.text?.matchAll(/^([\u4e00-\u9fa5]{2,14})[，、]?(?:是指|指|是)/gm) ?? []) {
      if (CLEAN.test(def[1])) terms.add(def[1]);
    }
  }
  return [...terms];
}

function bigrams(term) {
  const set = new Set();
  for (let i = 0; i < term.length - 1; i += 1) set.add(term.slice(i, i + 2));
  return set;
}

function dice(a, b) {
  if (a === b || a.includes(b) || b.includes(a)) return 0; // 子串对在出题侧已排除，不给分
  const ga = bigrams(a);
  const gb = bigrams(b);
  let common = 0;
  for (const g of ga) if (gb.has(g)) common += 1;
  if (common === 0) return 0;
  return (2 * common) / (ga.size + gb.size);
}

// 章 → 术语集（含跨课聚合）
const pairScores = new Map(); // "a\u0000b"（a<b）→ 最高相似度
/** 章内 step.terms 全集：运行时干扰项池只收 step.terms（collectSiblingTerms/lessonTerms），
 *  伙伴必须在这里面才可能被选中——引号术语/定义句首概念只做 key（它们是答案候选） */
const stepTermUniverse = new Set();
for (const subject of SUBJECTS) {
  const book = JSON.parse(readFileSync(resolve(root, `src/data/law/${subject}.json`), "utf8")).book;
  for (const chapter of book.chapters) {
    if (chapter.appendix) continue;
    for (const lesson of chapter.lessons) {
      if (lesson.shell) continue;
      for (const step of lesson.steps ?? []) {
        for (const t of step.terms ?? []) {
          const cleaned = t.term?.trim().replace(/^[（(【[]|[）)】\]]$/g, "").trim();
          if (cleaned && CLEAN.test(cleaned)) stepTermUniverse.add(cleaned);
        }
      }
    }
  }
}
let termCount = 0;
for (const subject of SUBJECTS) {
  const book = JSON.parse(readFileSync(resolve(root, `src/data/law/${subject}.json`), "utf8")).book;
  for (const chapter of book.chapters) {
    if (chapter.appendix) continue;
    const terms = new Set();
    for (const lesson of chapter.lessons) {
      if (lesson.shell) continue;
      for (const term of termsOfLesson(lesson)) terms.add(term);
    }
    const list = [...terms];
    termCount += list.length;
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const [a, b] = list[i] < list[j] ? [list[i], list[j]] : [list[j], list[i]];
        // 伙伴必须是运行时池可达词（step.terms），否则对子再像也选不中
        if (!stepTermUniverse.has(a) && !stepTermUniverse.has(b)) continue;
        const score = dice(a, b);
        if (score < 0.25) continue;
        const key = `${a}\u0000${b}`;
        pairScores.set(key, Math.max(pairScores.get(key) ?? 0, score));
      }
    }
  }
}

// 术语 → 按分排序的混淆伙伴（top-4）；伙伴只留 step.terms 词（可被干扰项池选中）
const byTerm = new Map();
function addPartner(term, partner, score) {
  if (!stepTermUniverse.has(partner)) return;
  if (!byTerm.has(term)) byTerm.set(term, []);
  byTerm.get(term).push([partner, score]);
}
for (const [key, score] of pairScores) {
  const [a, b] = key.split("\u0000");
  addPartner(a, b, score);
  addPartner(b, a, score);
}
const TOP_K = 4;
const entries = [];
for (const [term, partners] of byTerm) {
  const top = partners.sort((x, y) => y[1] - x[1]).slice(0, TOP_K).map(([t]) => t);
  if (top.length > 0) entries.push([term, top]);
}
entries.sort((a, b) => (a[0] < b[0] ? -1 : 1));

// 每行打包 4 个键值对：生成物行数守 500 行架构预算（687 词 → ~180 行）
const PER_LINE = 4;
const chunks = [];
for (let i = 0; i < entries.length; i += PER_LINE) {
  chunks.push(
    "  " +
      entries
        .slice(i, i + PER_LINE)
        .map(([term, top]) => `${JSON.stringify(term)}: ${JSON.stringify(top.join("|"))}`)
        .join(", ") +
      ",",
  );
}
const out = `// 由 scripts/build-law-distractors.mjs 生成（npm run law:distractors）——勿手改。
// 同章高频混淆对：章内术语两两字符相似度（Dice ≥0.25，子串对不计），每词 top-${TOP_K}。
// 数据源：src/data/law/*.json（S2 管线产物）。共 ${entries.length} 词 / ${pairScores.size} 对。
export const CONFUSION_PAIRS: Record<string, string> = {
${chunks.join("\n")}
};
`;
writeFileSync(resolve(root, "src/lib/law-confusion-data.ts"), out, "utf8");
console.log(
  `术语 ${termCount}（章内聚合）→ 混淆词 ${entries.length} / 对 ${pairScores.size}，产物 ${(out.length / 1024).toFixed(1)}KB`,
);
