/**
 * 多选题（multi）生成：课本里"X 包括：①②③④"式列举步，干净条目 ≥4 时出多选。
 * 正确项 = 列举条目本身（上限 5 条，按书中顺序）；干扰项从同章概念词取，
 * 且不得出现在本课正文（否则"本课也讲过"造成歧义）。全对才对，无部分分。
 * 主题来自课时标题（列举步正文通常直接以①/1. 开头，没有引导句前缀）。
 */
import type { LawLesson, LawQuizItem } from "../types/law";
import { cleanOrderPart, isGarbledOrderPart, optionsAreDistinct } from "./law-quiz-gates";
import { preferConfusables } from "./law-confusion";

const ITEM_PREFIX = /^[①②③④⑤⑥⑦⑧⑨⑩]|^\d{1,2}[.、．]|^[（(][一二三四五六七八九十]{1,4}[)）]/;

function stripItemPrefix(part: string): string {
  return part
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]/, "")
    .replace(/^\d{1,2}[.、．]/, "")
    .replace(/^[（(][一二三四五六七八九十]{1,4}[)）]/, "")
    .trim();
}

/** 课时标题清洗：剥掉尾部的考试注记与开头的设问指令词（"简述X的意义（2016年简答）"→"X的意义"） */
export function multiTopicOf(title: string): string | null {
  const cleaned = title
    .replace(/[（(][^（）()]*?(简答|论述|分析|法条分析|非法学|法学|联考|选择题)[^（）()]*?[)）]\s*$/g, "")
    .replace(/^(简答|简述|论述|试述|试论|辨析)\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 3 || cleaned.length > 24) return null;
  if (/^(作者的话|使用说明|序言|前言|后记)$/.test(cleaned)) return null;
  return cleaned;
}

/**
 * 课时 raw 里的"独立标签"集合：整行就是一个 2-3 字词（表格行列标签，如"客体/权限/内容"），
 * 或行首"标签："式。列举条目尾部焊接了这些标签时剥离（双栏表格交错残迹）。
 */
function standaloneLabelsOf(lesson: LawLesson): Set<string> {
  const labels = new Set<string>();
  for (const line of lesson.raw ?? []) {
    const text = line.trim();
    const whole = /^[\u4e00-\u9fa5]{2,4}$/.exec(text);
    if (whole) {
      labels.add(whole[0]);
      continue;
    }
    const headed = /^([\u4e00-\u9fa5]{2,3})[：:]/.exec(text);
    if (headed) labels.add(headed[1]);
  }
  return labels;
}

/** 悬垂动词（宾语被剥掉后句意不完整）："…予以保密"剥掉"保密"剩"…予以"必须回退 */
const DANGLING_VERB = /(予以|进行|属于|坚持|违反|构成|侵犯|实施|履行|承担|享有|行使|受到|遭到|加以|作出|制定|成为|作为|视为|认定|追究|给予|要求|需要|应当|必须|不得|可以|能够)$/;

/** 条目尾部的焊接标签剥离："…个别性调整措施权限"→"…个别性调整措施"（权限是 raw 独立标签行）。
 *  剥完若以悬垂动词收尾（"予以/进行"等待宾语）说明那不是焊接而是正文，回退原样。 */
function stripWeldedLabel(part: string, labels: Set<string>): string {
  if (part.length < 10 || labels.size === 0) return part;
  for (const n of [4, 3, 2]) {
    if (part.length - n < 8) continue;
    const stripped = part.slice(0, -n);
    if (!labels.has(part.slice(-n))) continue;
    if (DANGLING_VERB.test(stripped) || /[联的与和或及在是对为把被从而并按据向于变受]$/.test(stripped)) continue;
    return stripped;
  }
  return part;
}

/**
 * 从一节课里找多选题素材；无合格列举步返回 null。
 * 闸门（与排序题同款，宁缺毋滥）：rough 步不用、条目 4-40 字、无乱码、无截尾连接词；
 * 正确项 ≥3 条（任务书铁则：<3 不出题）；干扰项与正确项/彼此互不为子串。
 */
export function buildMultiItem(
  lesson: LawLesson,
  contextTerms: string[],
  lessonText: string,
  rand: () => number,
): LawQuizItem | null {
  const topic = multiTopicOf(lesson.title);
  if (!topic) return null;
  const labels = standaloneLabelsOf(lesson);
  for (const step of shuffle(lesson.steps, rand)) {
    if (step.rough || step.kind === "mnemonic") continue;
    if (!ITEM_PREFIX.test(step.text)) continue;
    // 行内夹［注记］标签 = 对比表格交错页（C 管线的已知残迹页），整步不用
    if ((step.parts ?? []).some((part) => /［[^［］]{1,8}］/.test(part))) continue;
    const parts = (step.parts ?? [])
      .map((part) => part.trim())
      .filter((part) => ITEM_PREFIX.test(part))
      .map(stripItemPrefix)
      .map((part) => part.replace(/[。；;]\s*$/, ""))
      .map((part) => stripWeldedLabel(part, labels))
      .map(cleanOrderPart)
      .filter((part) => part.length >= 5 && part.length <= 40 && !/[①-⑨]/.test(part))
      .filter((part) => !/[联的与和或及在是对为把被从而并按据向于变受：:]$/.test(part))
      // 悬垂动词收尾 = 断头碎片（"不履行"缺宾语），不是完整列举项
      .filter((part) => !DANGLING_VERB.test(part))
      .filter((part) => !isGarbledOrderPart(part));
    if (parts.length < 4) continue;
    const correct = [...new Set(parts)].slice(0, 5);
    if (correct.length < 3) continue;
    // 干扰项：同章概念词，不在本课正文里出现，与正确项互不为子串
    const correctSet = new Set(correct);
    const pool = [...new Set(contextTerms)].filter(
      (t) =>
        t.length >= 4 &&
        t.length <= 14 &&
        // "岁以上/以下/不满N"= 词条焊接残串（"完全民事岁以上的未成年人"），不做干扰项
        !/岁以上|岁以下|不满[一二三四五六七八九十0-9]/.test(t) &&
        !correctSet.has(t) &&
        !lessonText.includes(t) &&
        // 干扰项是主题（课时标题）的子串 → 题面里可见，歧义，剔除
        !topic.includes(t) &&
        !correct.some((c) => c.includes(t) || t.includes(c)),
    );
    // T5：主题命中高频混淆对的干扰项优先（topic 与术语同名时才命中，如"法律规则"）
    const shuffled = preferConfusables(shuffle(pool, rand), topic);
    const distractors: string[] = [];
    for (const candidate of shuffled) {
      const options = [...correct, ...distractors, candidate];
      if (!optionsAreDistinct(options)) continue;
      distractors.push(candidate);
      if (distractors.length >= 3) break;
    }
    if (distractors.length < 2) continue;
    const options = shuffle([...correct, ...distractors], rand);
    return {
      id: `${lesson.id}-qm`,
      kind: "multi",
      prompt: `下列哪些是书里讲「${topic}」时列出的内容？（多选：全对才得分，多选少选都算错）`,
      options,
      answer: correct.join("、"),
      multi: correct,
      explain: `书里列的是：${correct.join("；")}。其余选项出自本章其他课，不属于这个列举。`,
    };
  }
  return null;
}

function shuffle<T>(list: T[], rand: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
