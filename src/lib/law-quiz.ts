import type { LawLesson, LawQuizItem, LawStep } from "../types/law";
import { isCleanTerm } from "../types/law";

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

/** 清洗后的候选术语：太短/含 OCR 残渣/纯数字的都不要 */
function cleanTerm(term: string | null | undefined): string | null {
  if (!term) return null;
  const text = term.trim().replace(/^[（(【[]|[）)】\]]$/g, "").trim();
  return isCleanTerm(text) ? text : null;
}

/** 本课关键词池：只从本课内容提取，绝不用其他课/其他书的词凑数 */
function lessonTerms(lesson: LawLesson): string[] {
  const terms: string[] = [];
  for (const step of lesson.steps) {
    for (const term of step.terms ?? []) {
      const cleaned = cleanTerm(term.term);
      if (cleaned && !terms.includes(cleaned)) terms.push(cleaned);
    }
    const auto = cleanTerm(tellTerm(step.text));
    if (auto && !terms.includes(auto)) terms.push(auto);
  }
  return terms;
}

/** 本课核心概念：只用正文里出现的实概念（≥3 字），不用题目名凑数 */
function lessonConcepts(lesson: LawLesson): string[] {
  return lessonTerms(lesson).filter((term) => term.length >= 3);
}

/** 短定义句："X，是指/指/是…" 且不含列表/分号，便于整句展示与挖空 */
function isShortDefinition(text: string): boolean {
  if (text.length > 90) return false;
  if (/[①-⑨]|；|^[（(]/.test(text)) return false;
  return /^[\u4e00-\u9fa5]{2,14}[，、]?(是指|指|是)["“「《（]?/.test(text);
}

/** 提取短定义句的句首概念（挖空目标） */
function headTermOf(text: string): string | null {
  const match = text.match(/^([\u4e00-\u9fa5]{2,14})[，、]?(是指|指|是)/);
  if (!match) return null;
  return cleanTerm(match[1]);
}

/** 短句（适合当判断题/填空题） */
function isShortSentence(text: string): boolean {
  return text.length >= 10 && text.length <= 90 && !/[①-⑨]/.test(text) && !/；/.test(text);
}

const NUMBER_PATTERN = /\d{3,4}年|\d{2,4}年/;

/** 把句中年份改成一个确定不同的值（构造可判定的"错"句） */
function mutateNumber(text: string, rand: () => number): string | null {
  const match = NUMBER_PATTERN.exec(text);
  if (!match) return null;
  const token = match[0];
  const digits = token.match(/\d+/);
  if (!digits) return null;
  const value = Number(digits[0]);
  if (!Number.isFinite(value) || value < 2) return null;
  let mutated = value + Math.floor(rand() * 12) - 6;
  if (mutated === value) mutated += 1;
  if (mutated < 1) mutated = value + 5;
  const next = token.replace(digits[0], String(mutated));
  return `${text.slice(0, match.index)}${next}${text.slice(match.index + token.length)}`;
}

function stripItemPrefix(part: string): string {
  return part
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]/, "")
    .replace(/^\d{1,2}[.、．]/, "")
    .replace(/^[（(][一二三四五六七八九十]{1,4}[)）]/, "")
    .trim();
}

/**
 * 自测题生成（保守模式）：
 * - 题面全部来自本课内容且为短句；挖空只挖句首概念或引号术语；
 * - 干扰项只取"本课 + 同章其他课"的概念（保证相关），答案绝不出自别处；
 * - 题面无法一眼看懂就跳过（宁缺毋滥）。
 */
export function buildQuiz(lesson: LawLesson, contextTerms: string[] = []): LawQuizItem[] {
  const rand = mulberry32(hashSeed(lesson.id));
  const items: LawQuizItem[] = [];
  const usedPrompts = new Set<string>();
  const terms = lessonTerms(lesson);
  const distractorsFrom = (target: string, randFn: () => number, need: number): string[] => {
    const pool = [...terms, ...contextTerms];
    return shuffle(
      pool.filter((t) => t !== target && t !== target && t.length >= 2),
      randFn,
    ).slice(0, need);
  };
  const definitions = lesson.steps.filter((step) => isShortDefinition(step.text));

  // 1) 定义挖空：＿＿＿，是指…（最多两条）
  for (const step of shuffle(definitions, rand).slice(0, 3)) {
    if (items.length >= 2) break;
    const target = headTermOf(step.text);
    if (!target || !step.text.includes(target)) continue;
    const prompt = step.text.replace(target, "＿＿＿");
    if (usedPrompts.has(prompt) || prompt.length > 90) continue;
    const distractors = distractorsFrom(target, rand, 3);
    if (distractors.length < 1) continue;
    usedPrompts.add(prompt);
    items.push({
      id: `${lesson.id}-q1-${items.length}`,
      kind: "mcq",
      prompt,
      options: shuffle([target, ...distractors], rand).slice(0, 4),
      answer: target,
      explain: step.text,
    });
  }

  // 2) 排序：只取短条目（≥5字且≤40字），把编号藏掉，按书中顺序回答
  for (const step of lesson.steps) {
    const parts = (step.parts ?? [])
      .map((part) => part.trim())
      .filter(
        (part) =>
          (/^[①②③④⑤⑥⑦⑧⑨⑩]|^\d{1,2}[.、．]|^[（(][一二三四五六七八九十]{1,4}[)）]/.test(part)),
      )
      .map(stripItemPrefix)
      .filter((part) => part.length >= 5 && part.length <= 40 && !/[①-⑨]/.test(part));
    if (parts.length < 3) continue;
    const correct = parts.slice(0, 4);
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
    break;
  }

  // 3) 是非判断：仅当有短句含年份 → 改年份；否则跳过（避免脸谱式出题）
  for (const step of shuffle(lesson.steps, rand).slice(0, 4)) {
    if (!isShortSentence(step.text)) continue;
    const mutated = mutateNumber(step.text, rand);
    if (!mutated || mutated === step.text || usedPrompts.has(mutated)) continue;
    usedPrompts.add(mutated);
    items.push({
      id: `${lesson.id}-q3`,
      kind: "judge",
      prompt: `书上是这样说的吗？\n「${mutated}」`,
      answer: "否",
      options: ["是", "否"],
      explain: `书上说的是：${step.text}`,
    });
    break;
  }

  // 4) 关键词填空：短句 + 引号术语（只挖引号内容，选项全来自本课/同章）
  const pool = shuffle(
    lesson.steps.filter((step) => isShortSentence(step.text)),
    rand,
  );
  for (const step of pool) {
    if (items.length >= 4) break;
    const quoted = step.text.match(/["“「《]([^"”」》]{2,12})["”」》]/);
    if (!quoted) continue;
    const target = cleanTerm(quoted[1]);
    if (!target) continue;
    const prompt = step.text.replace(target, "＿＿＿");
    if (!prompt || usedPrompts.has(prompt) || prompt.length > 90) continue;
    const distractors = distractorsFrom(target, rand, 3);
    if (distractors.length < 1) continue;
    usedPrompts.add(prompt);
    items.push({
      id: `${lesson.id}-q4-${items.length}`,
      kind: "mcq",
      prompt,
      options: shuffle([target, ...distractors], rand).slice(0, 4),
      answer: target,
      explain: step.text,
    });
    break;
  }

  // 5) 概念识别（保底）：本课正文概念 vs 同章邻课概念，答案唯一可判定；
  //    与前面的挖空题不重复，干扰项优先长度相近
  const concepts = lessonConcepts(lesson);
  const siblingPool = contextTerms.filter((t) => t.length >= 3 && !concepts.includes(t));
  const usedAnswers = new Set(items.map((item) => item.answer));
  const concept = concepts.find((c) => !usedAnswers.has(c));
  if (concept && siblingPool.length >= 2 && items.length < 3) {
    const distractors = [...siblingPool]
      .sort((a, b) => Math.abs(a.length - concept.length) - Math.abs(b.length - concept.length))
      .slice(0, 3);
    const contextLine = lesson.steps
      .map((step) => step.text)
      .find((text) => text.includes(concept));
    items.push({
      id: `${lesson.id}-q5`,
      kind: "mcq",
      prompt: "这节课讲的是哪个概念？（选项都来自本课/同章）",
      options: shuffle([concept, ...distractors], rand).slice(0, 4),
      answer: concept,
      explain: contextLine ? `${concept} —— ${contextLine.slice(0, 80)}` : `${concept} —— 本课核心概念`,
    });
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
