import type { LawLesson, LawQuizItem, LawStep } from "../types/law";

/** 确定性伪随机（同一课时每次生成相同自测题） */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: T[], rand: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sentencesOf(lesson: LawLesson): string[] {
  return lesson.steps
    .map((step) => step.text)
    .filter((text) => text.length >= 8);
}

function termsOf(lesson: LawLesson): string[] {
  const terms: string[] = [];
  for (const step of lesson.steps) {
    for (const term of step.terms ?? []) {
      if (term.term.length >= 2 && !terms.includes(term.term)) terms.push(term.term);
    }
    const auto = tellTerm(step.text);
    if (auto && auto.length >= 2 && !terms.includes(auto)) terms.push(auto);
  }
  return terms;
}

/** 通用法硕术语池：课程本身关键词不足时作为干扰项兜底 */
const LAW_TERM_POOL = [
  "直接故意", "间接故意", "犯罪故意", "犯罪过失", "犯罪构成", "正当防卫", "紧急避险",
  "刑事责任", "刑罚", "主刑", "附加刑", "量刑", "累犯", "自首", "立功", "缓刑",
  "侵权", "违约", "合同", "要约", "承诺", "解除权", "抗辩权", "撤销权",
  "民事权利", "民事义务", "民事主体", "自然人", "法人", "代理", "诉讼时效",
  "物权", "债权", "抵押权", "质权", "留置权", "用益物权", "人格权", "所有权",
  "宪法", "法律", "行政法规", "地方性法规", "国家机构", "人民代表大会", "公民",
  "基本权利", "基本义务", "立法权", "司法权", "法治", "法制", "法律体系",
  "法律渊源", "法律规则", "法律原则", "违法行为", "法律责任", "法律制裁",
];

function blankPattern(text: string, term: string, rand: () => number): string | null {
  const index = text.indexOf(term);
  if (index < 0) return null;
  const before = text.slice(0, index);
  const after = text.slice(index + term.length);
  // 允许关键词在句首（定义句常见），但句尾必须有后续内容
  if (!after) return null;
  return `${before}＿＿＿${after}`;
}

function poolDistractors(pool: string[], target: string, rand: () => number, need: number): string[] {
  const source = [...pool, ...LAW_TERM_POOL];
  const list = shuffle(
    source.filter((t) => t !== target && t.length >= 2),
    rand,
  );
  return list.slice(0, need);
}

export function buildQuiz(lesson: LawLesson): LawQuizItem[] {
  const rand = mulberry32(hashSeed(lesson.id));
  const items: LawQuizItem[] = [];
  const definitions = lesson.steps.filter((step) => step.kind === "definition");
  const lists = lesson.steps.filter((step) => (step.parts?.length ?? 0) >= 3);
  const terms = termsOf(lesson);

  // 1) 定义挖空（mcq）
  const defsPool = shuffle(
    definitions.length > 0 ? definitions : lesson.steps,
    rand,
  ).slice(0, 2);
  for (const step of defsPool) {
    const localTerms = (step.terms ?? []).map((t) => t.term).filter((t) => t.length >= 2);
    const target = localTerms[0] ?? tellTerm(step.text);
    if (!target || !step.text.includes(target)) continue;
    const prompt = blankPattern(step.text, target, rand);
    if (!prompt) continue;
    const distractors = poolDistractors(terms, target, rand, 3);
    if (distractors.length < 2) continue;
    const options = shuffle([target, ...distractors], rand).slice(0, 4);
    items.push({
      id: `${lesson.id}-q1-${items.length}`,
      kind: "mcq",
      prompt,
      options,
      answer: target,
      explain: step.text,
    });
  }

  // 2) 排序
  for (const step of lists.slice(0, 1)) {
    const correct = step.parts!.slice(0, 4);
    if (correct.length < 3) continue;
    const shuffled = shuffle(correct, rand);
    if (shuffled.join("|") === correct.join("|")) continue;
    items.push({
      id: `${lesson.id}-q2`,
      kind: "order",
      prompt: "点按下方卡片，按书中顺序排列：",
      order: correct,
      answer: correct.join("→"),
      explain: step.text,
    });
  }

  // 3) 是非判断（换掉关键词）
  for (const step of defsPool.slice(0, 1)) {
    const target = (step.terms ?? []).map((t) => t.term).find((t) => t.length >= 2)
      ?? tellTerm(step.text);
    if (!target || !step.text.includes(target)) continue;
    const wrong = poolDistractors(terms, target, rand, 1)[0];
    if (!wrong) continue;
    const statement = step.text.replace(target, wrong);
    if (statement === step.text) continue;
    items.push({
      id: `${lesson.id}-q3`,
      kind: "judge",
      prompt: `书上是这样说的吗？\n「${statement}」`,
      answer: "否",
      options: ["是", "否"],
      explain: `书上说的是：${step.text}`,
    });
  }

  // 4) 关键词填空（mcq，避免与前面重复）
  const usedPrompts = new Set(items.map((item) => item.prompt));
  const pool = sentencesOf(lesson).slice();
  while (items.length < 4 && pool.length > 0) {
    const text = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    const target = tellTerm(text);
    if (!target || !text.includes(target)) continue;
    const prompt = blankPattern(text, target, rand);
    if (!prompt || usedPrompts.has(prompt)) continue;
    const distractors = poolDistractors(terms, target, rand, 3);
    if (distractors.length < 2) continue;
    usedPrompts.add(prompt);
    items.push({
      id: `${lesson.id}-q4-${items.length}`,
      kind: "mcq",
      prompt,
      options: shuffle([target, ...distractors], rand).slice(0, 4),
      answer: target,
      explain: text,
    });
    break;
  }

  return items.slice(0, 4);
}

/** 从句子中尽力找出一个"关键词"（最长连续非虚词片段）。 */
export function tellTerm(text: string): string | null {
  // 引号/书名号/全角括号包住的内容（避免在字符类里混入 ASCII 括号，兼容各解析器）
  const quoted = text.match(/[\u201c\u300c\u300a\uff08](.{2,10}?)[\u201d\u300d\u300b\uff09]/);
  if (quoted) return quoted[1];
  const mnemonic = text.match(/记作?[：:]\s*([^，。；]{2,12})/);
  if (mnemonic) return mnemonic[1];
  const termAfterJi = text.match(/即["“「]?([^，。；」”]{2,12})/);
  if (termAfterJi) return termAfterJi[1];
  const termBeforeZhi = text.split(/(?:是)?指/)[0];
  if (termBeforeZhi) {
    const candidate = termBeforeZhi
      .replace(/[，。；：、\s]+$/, "")
      .split(/[，。；：、\s]+/)
      .pop();
    if (candidate && candidate.length >= 2 && candidate.length <= 12) return candidate;
  }
  return null;
}

export { hashSeed };
