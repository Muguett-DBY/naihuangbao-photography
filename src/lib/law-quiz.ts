import type { LawLesson, LawQuizItem, LawStep } from "../types/law";
import { isShellLesson } from "../types/law";
import {
  cleanTerm,
  isCleanVerbatimSentence,
  isMutableSentence,
  isGarbledOrderPart,
  cleanOrderPart,
  hasFragmentCard,
  optionsAreDistinct,
} from "./law-quiz-gates";
import { buildMultiItem } from "./law-quiz-multi";
import { confusablesOf, preferConfusables } from "./law-confusion";
import { mutateNumber, mutateCnNumber, mutateQuotedTerm } from "./law-quiz-mutate";

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

/**
 * 本课核心概念（概念识别题答案候选池）：
 * 只收"实体概念"——引号/括号术语 + 定义句句首概念；杜绝 tellTerm 自动捞出的
 * 句子碎片（如"需要做好以下工作"）混进答案。
 */
function lessonConcepts(lesson: LawLesson): string[] {
  const out: string[] = [];
  for (const step of lesson.steps) {
    for (const term of step.terms ?? []) {
      const cleaned = cleanTerm(term.term);
      if (cleaned && cleaned.length >= 3 && !out.includes(cleaned)) out.push(cleaned);
    }
  }
  for (const step of lesson.steps) {
    if (!isShortDefinition(step.text)) continue;
    const head = headTermOf(step.text);
    if (head && head.length >= 3 && !out.includes(head)) out.push(head);
  }
  return out;
}

/** 短定义句："X，是指/指/是…""所谓X，是指…""X：指…"，便于整句展示与挖空 */
function isShortDefinition(text: string): boolean {
  if (text.length > 90) return false;
  if (/[①-⑨]|；|^[（(]/.test(text)) return false;
  if (/^[\u4e00-\u9fa5]{2,14}[，、]?(是指|指|是)["“「《（]?/.test(text)) return true;
  if (/^所谓[\u4e00-\u9fa5]{2,12}[，、]?(是指|指|是)/.test(text)) return true;
  if (/^[\u4e00-\u9fa5]{2,12}[：:](是指|指)/.test(text)) return true;
  return false;
}

/** 提取短定义句的句首概念（挖空目标） */
function headTermOf(text: string): string | null {
  let match = text.match(/^([\u4e00-\u9fa5]{2,14})[，、]?(是指|指|是)/);
  if (match) return cleanTerm(match[1]);
  match = text.match(/^所谓([\u4e00-\u9fa5]{2,12})[，、]?(是指|指|是)/);
  if (match) return cleanTerm(match[1]);
  match = text.match(/^([\u4e00-\u9fa5]{2,12})[：:](是指|指)/);
  if (match) return cleanTerm(match[1]);
  return null;
}

/** 把步骤正文切成句（判断题取材单位） */
function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[。！？])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** 短句（适合当判断题/填空题）：独立成句、无列表符、无分号、无页边注记 */
function isUsableSentence(text: string): boolean {
  return (
    text.length >= 10 &&
    text.length <= 90 &&
    !/[①-⑨]/.test(text) &&
    !/；/.test(text) &&
    !/^[（(]/.test(text) &&
    // ［注记］是页边速记标记，挖进题面读不通（与判断题闸门同口径）
    !/[\[［\]］]/.test(text)
  );
}

/** 本课全部可用短句（判断题/挖空题的取材池） */
function lessonSentences(lesson: LawLesson): string[] {
  const out: string[] = [];
  for (const step of lesson.steps) {
    for (const sentence of sentencesOf(step.text)) {
      if (isUsableSentence(sentence) && !out.includes(sentence)) out.push(sentence);
    }
  }
  return out;
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
 * - 判断题混合"改年份（答否）"与"原句重现（答是）"，防止无脑答"否"的套路；
 * - 题面无法一眼看懂就跳过（宁缺毋滥）。
 */
/** 元信息课（作者的话/使用说明/序言）：是书前言而非考点，不出题 */
function isMetaLesson(lesson: LawLesson): boolean {
  if (/^(作者的话|使用说明|序言|前言|后记)$/.test(lesson.title.trim())) return true;
  return lesson.breadcrumb.some((crumb) => /^(作者的话|使用说明|序言|前言|后记)$/.test(crumb.trim()));
}

export function buildQuiz(lesson: LawLesson, contextTerms: string[] = []): LawQuizItem[] {
  // 索引空壳课（纯标题、无正文）不出题：无知识可考，题面也只是标题复读
  if (isShellLesson(lesson) || isMetaLesson(lesson)) return [];
  const rand = mulberry32(hashSeed(lesson.id));
  const items: LawQuizItem[] = [];
  const usedPrompts = new Set<string>();
  const terms = lessonTerms(lesson);
  const sentences = lessonSentences(lesson);
  const distractorsFrom = (target: string, randFn: () => number, need: number, excludeInPrompt?: string): string[] => {
    // 本课词与同章词可能重叠，必须去重，否则选项会出现两个相同的干扰项
    const pool = [...new Set([...terms, ...contextTerms])];
    const eligible = pool.filter((t) => {
      if (t === target || t.length < 2) return false;
      // 干扰项与答案互为子串（"国家监督" vs "国家监督是"）→ 无法作答，剔除
      if (target.includes(t) || t.includes(target)) return false;
      // 干扰项出现在题面 → 歧义（可能两个"正确"选项），必须剔除
      if (excludeInPrompt && excludeInPrompt.includes(t)) return false;
      return true;
    });
    // T5：同章高频混淆对优先（更具迷惑性），其余随机补位
    const preferred = preferConfusables(eligible, target).slice(0, need);
    if (preferred.length >= need) return preferred;
    return [...new Set([...preferred, ...shuffle(eligible, randFn)])].slice(0, need);
  };
  const definitions = lesson.steps.filter((step) => isShortDefinition(step.text));

  // 1) 定义挖空：＿＿＿，是指…（最多两条）。题面必须以句读收尾——截断残句不配上题。
  //    双形态：约半数课走 fill（无选项、纯回忆作答），其余保留 mcq；每课至多一道 fill
  const endsClean = (text: string) => /[。！？；…”」》）]$/.test(text);
  const wantFill = rand() < 0.5;
  let madeFill = false;
  for (const step of shuffle(definitions, rand).slice(0, 3)) {
    if (items.length >= 2) break;
    const target = headTermOf(step.text);
    if (!target || !step.text.includes(target)) continue;
    const prompt = step.text.replace(target, "＿＿＿");
    if (usedPrompts.has(prompt) || prompt.length > 90) continue;
    if (!endsClean(prompt)) continue;
    // 答案概念还在题面里出现 → 答案直接可见，跳过
    if (prompt.includes(target)) continue;
    if (wantFill && !madeFill && target.length >= 3 && target.length <= 8) {
      usedPrompts.add(prompt);
      madeFill = true;
      items.push({
        id: `${lesson.id}-q1f-${items.length}`,
        kind: "fill",
        prompt,
        answer: target,
        explain: step.text,
      });
      continue;
    }
    const distractors = distractorsFrom(target, rand, 3, prompt);
    if (distractors.length < 1) continue;
    const options = shuffle([target, ...distractors], rand).slice(0, 4);
    if (!optionsAreDistinct(options)) continue;
    usedPrompts.add(prompt);
    items.push({
      id: `${lesson.id}-q1-${items.length}`,
      kind: "mcq",
      prompt,
      options,
      answer: target,
      explain: step.text,
    });
  }

  // 2) 排序：只取短条目（≥5字且≤40字），把编号藏掉，按书中顺序回答。
  //    先过滤后截取：OCR 焊接/糊字条目绝不进题面（读不通的卡片没有训练价值）
  for (const step of lesson.steps) {
    // 构建期标记的"粗糙"步骤（括号失衡/悬停截尾=表格交错残迹）不配产出排序卡
    if (step.rough) continue;
    const parts = (step.parts ?? [])
      .map((part) => part.trim())
      .filter(
        (part) =>
          (/^[①②③④⑤⑥⑦⑧⑨⑩]|^\d{1,2}[.、．]|^[（(][一二三四五六七八九十]{1,4}[)）]/.test(part)),
      )
      .map(stripItemPrefix)
      .map(cleanOrderPart)
      .filter((part) => part.length >= 5 && part.length <= 40 && !/[①-⑨]/.test(part))
      // 截断残条过滤：以连接词/助词收尾的多为表格断行（"…变动的联""…的"）
      .filter((part) => !/[联的与和或及在是对为把被从而并按据向于变受]/.test(part.slice(-1)))
      .filter((part) => !isGarbledOrderPart(part));
    if (parts.length < 3) continue;
    const correct = parts.slice(0, 4);
    if (new Set(correct).size !== correct.length) continue;
    if (hasFragmentCard(correct)) continue;
    const shuffled = shuffle(correct, rand);
    if (shuffled.join("|") === correct.join("|")) continue;
    items.push({
      id: `${lesson.id}-q2`,
      kind: "order",
      prompt: "点按下方卡片，按书中顺序排列：",
      order: correct,
      answer: correct.join("→"),
      // 解析用干净的正确顺序展示，避免整段 OCR 拼接文的杂讯
      explain: `书中顺序：${correct.join(" → ")}`,
    });
    break;
  }

  // 3) 判断题（最多一题）：优先三种"变错"手段（答否）——改阿拉伯年份、改中文数字年份、
  //    换引号/书名术语；全部失败才取原句（答是）。曾因变异命中率过低导致 98% 判断题答"是"，
  //    混合多种变异防"无脑答是/否"的套路。trap 记录用了哪种陷阱（错因标签推导输入）
  const cleanSentences = sentences.filter(isCleanVerbatimSentence);
  const mutableSentences = sentences.filter(isMutableSentence);
  let judgeDone = false;
  for (const sentence of shuffle(mutableSentences, rand).slice(0, 10)) {
    if (judgeDone) break;
    const byNumber = mutateNumber(sentence, rand);
    const byCn = byNumber ? null : mutateCnNumber(sentence, rand);
    const byTerm = byNumber || byCn ? null : mutateQuotedTerm(sentence, [...terms, ...contextTerms], rand);
    const mutation = byNumber ?? byCn ?? byTerm;
    if (!mutation || mutation.text === sentence || usedPrompts.has(mutation.text)) continue;
    usedPrompts.add(mutation.text);
    judgeDone = true;
    items.push({
      id: `${lesson.id}-q3`,
      kind: "judge",
      prompt: `书上是这样说的吗？\n「${mutation.text}」`,
      answer: "否",
      options: ["是", "否"],
      trap: mutation.trap,
      explain: `书上说的是：${sentence}`,
    });
  }
  if (!judgeDone) {
    // 原句判断（答"是"）：只取完整干净的句子，优先带引号术语/数字的
    const complete = sentences.filter(isCleanVerbatimSentence);
    const rich = complete.filter((s) => /\d/.test(s));
    const general = rich.length > 0 ? rich : complete;
    for (const sentence of shuffle(general, rand).slice(0, 6)) {
      if (usedPrompts.has(sentence)) continue;
      usedPrompts.add(sentence);
      judgeDone = true;
      items.push({
        id: `${lesson.id}-q3v`,
        kind: "judge",
        prompt: `书上是这样说的吗？\n「${sentence}」`,
        answer: "是",
        options: ["是", "否"],
        trap: "verbatim",
        explain: "是的，这正是书上的原句，再读一遍加深印象！",
      });
      break;
    }
  }

  // 3.5) 多选题：列举步 ≥4 条干净条目（正确项=条目，干扰项出自同章且不在本课正文）。
  //      放判断题之后：判断题存量基线（否占比 ≥15%）优先保住，多选吃剩余名额
  const lessonText = lesson.steps.map((step) => step.text).join("") + lesson.raw.join("");
  if (items.length < 4) {
    const multiItem = buildMultiItem(lesson, contextTerms, lessonText, rand);
    if (multiItem && !usedPrompts.has(multiItem.prompt)) {
      usedPrompts.add(multiItem.prompt);
      items.push(multiItem);
    }
  }

  // 4) 关键词填空：短句 + 引号术语（只挖引号内容，选项全来自本课/同章）；
  //    本课还没出过 fill 时约半数走填空形态（输入作答），其余保持选择
  const pool = shuffle(
    sentences,
    rand,
  );
  for (const sentence of pool) {
    if (items.length >= 4) break;
    const quoted = sentence.match(/["“「《]([^"”」》]{2,12})["”」》]/);
    if (!quoted) continue;
    const target = cleanTerm(quoted[1]);
    if (!target) continue;
    const prompt = sentence.replace(target, "＿＿＿");
    if (!prompt || usedPrompts.has(prompt) || prompt.length > 90) continue;
    if (!endsClean(prompt)) continue;
    if (prompt.includes(target)) continue;
    if (!madeFill && target.length >= 3 && target.length <= 8 && rand() < 0.5) {
      usedPrompts.add(prompt);
      madeFill = true;
      items.push({
        id: `${lesson.id}-q4f`,
        kind: "fill",
        prompt,
        answer: target,
        explain: sentence,
      });
      break;
    }
    const distractors = distractorsFrom(target, rand, 3, prompt);
    if (distractors.length < 1) continue;
    const options = shuffle([target, ...distractors], rand).slice(0, 4);
    if (!optionsAreDistinct(options)) continue;
    usedPrompts.add(prompt);
    items.push({
      id: `${lesson.id}-q4-${items.length}`,
      kind: "mcq",
      prompt,
      options,
      answer: target,
      explain: sentence,
    });
    break;
  }

  // 5) 概念识别（保底）：本课正文概念 vs 同章邻课概念，答案唯一可判定；
  //    与前面的挖空题不重复，干扰项优先长度相近。
  //    干扰项不得在本课正文中出现——否则"这节课讲的是哪个概念"有两个可选项（曾出 40 例歧义）
  const concepts = lessonConcepts(lesson);
  const siblingPool = contextTerms.filter(
    (t) => t.length >= 3 && !concepts.includes(t) && !lessonText.includes(t),
  );
  const usedAnswers = new Set(items.map((item) => item.answer));
  const concept = concepts.find((c) => !usedAnswers.has(c));
  if (concept && siblingPool.length >= 2 && items.length < 3) {
    // 干扰项排除与答案互为子串的候选，再按长度相近排序取前几个
    const confusionRank = confusablesOf(concept);
    const candidates = [...new Set(siblingPool)]
      .filter((t) => !t.includes(concept) && !concept.includes(t))
      // T5：命中混淆对的候选优先（稳定排序保持对内顺序），未命中的再按长度相近排
      .sort((a, b) => {
        const ra = confusionRank.indexOf(a);
        const rb = confusionRank.indexOf(b);
        const aHit = ra !== -1;
        const bHit = rb !== -1;
        if (aHit !== bHit) return aHit ? -1 : 1;
        return aHit ? ra - rb : Math.abs(a.length - concept.length) - Math.abs(b.length - concept.length);
      });
    const contextLine = lesson.steps
      .map((step) => step.text)
      .find((text) => text.includes(concept));
    // 组出一组互斥的选项（冲突则逐个换候补）
    let distractors = candidates.slice(0, 3);
    for (let i = 3; i <= candidates.length; i += 1) {
      const options = shuffle([concept, ...distractors], rand).slice(0, 4);
      if (optionsAreDistinct(options)) {
        items.push({
          id: `${lesson.id}-q5`,
          kind: "mcq",
          prompt: "这节课讲的是哪个概念？（正确答案出自本课）",
          options,
          answer: concept,
          explain: contextLine ? `${concept} —— ${contextLine.slice(0, 80)}` : `${concept} —— 本课核心概念`,
        });
        break;
      }
      if (i < candidates.length) {
        distractors = [...distractors.slice(1), candidates[i]];
      }
    }
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
