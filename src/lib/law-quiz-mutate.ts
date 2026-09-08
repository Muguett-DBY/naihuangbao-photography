/**
 * 判断题"变错"变异（从 law-quiz.ts 抽出）：把书上原句改出一个确定不同的版本。
 * 每个变异函数返回改后文本 + 陷阱类型（trap，错因标签推导用）。
 */
import type { LawQuizTrap } from "../types/law";
import { cleanTerm } from "./law-quiz-gates";
import { preferConfusables } from "./law-confusion";

export interface Mutation {
  text: string;
  trap: LawQuizTrap;
}

const NUMBER_PATTERN = /\d{3,4}年|\d{2,4}年/;

/** 把句中年份改成一个确定不同的值（构造可判定的"错"句） */
export function mutateNumber(text: string, rand: () => number): Mutation | null {
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
  return { text: `${text.slice(0, match.index)}${next}${text.slice(match.index + token.length)}`, trap: "number" };
}

const CN_NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

/** 中文数字变异（"文帝十三年"→"文帝七年""三十卷"→"八卷"）——法制史的数字多是汉字 */
export function mutateCnNumber(text: string, rand: () => number): Mutation | null {
  // 只变单数字与"十"：复合数字（"十二"）硬变易生成病句，跳过
  const match = /(?<![一二三四五六七八九十百千万])[一二三四五六七八九十](?=(?:年|卷|条|篇|种|人|日|品|等))/.exec(text);
  if (!match) return null;
  const token = match[0];
  const candidates = CN_NUMERALS.filter((n) => n !== token);
  const next = candidates[Math.floor(rand() * candidates.length)];
  return {
    text: `${text.slice(0, match.index)}${next}${text.slice(match.index + token.length)}`,
    trap: "cn-number",
  };
}

/** 常见姓氏开头 + 2~3 字，或帝王称号收尾——"人物错配"标签的判定口径 */
const SURNAMES = "商李韩萧曹刘张王赵陈杨沈薛吴郑孙马董房杜魏白宋柳窦裴郭姚袁谢管仲庄孟荀墨贾秦汉隋唐宋明";
const ROYAL_TITLE = /(文帝|武帝|太宗|高宗|太祖|高祖|玄宗|明皇|始皇|景帝|成祖|圣德|神宗|英宗)$/;

export function looksLikePerson(name: string): boolean {
  if (ROYAL_TITLE.test(name)) return true;
  // 4 字以上几乎都是制度/文献名（宋刑统、管制刑、马工程），不做单字姓联想
  if (name.length > 3) return false;
  return name.length >= 2 && name.length <= 3 && SURNAMES.includes(name[0]);
}

/**
 * 引号术语替换变异（把句中的《人身保护法》换成《权利法案》之类）：
 * 判断题问的是"书上是这样说的吗"——只要换了词，书上就没这么说（答"否"），
 * 解析里给出书上原句，作答与讲解都闭环。
 * 约束：不换进"本书/这部分内容"式的书自我引用句（那不是考点）；换词不以虚词/否定词开头
 * （防《非国家》这类病句）；长度相近，保证题面读起来像一句正常的话。
 * trap：书名号内 = book（文献错配），人名 = person，其余 = term（概念混淆）。
 */
export function mutateQuotedTerm(text: string, pool: string[], rand: () => number): Mutation | null {
  if (/本书|本册|这部分内容|一本通|精讲|背诵方法|方法论|主观题|客观题|真题|命题/.test(text)) return null;
  const quoted = text.match(/["“「《]([^”」》]{2,12})["”」》]/);
  if (!quoted) return null;
  const isBook = quoted[0].startsWith("《");
  const target = quoted[1];
  if (!cleanTerm(target)) return null;
  const candidates = pool.filter(
    (t) =>
      t.length >= 2 &&
      t !== target &&
      !t.includes(target) &&
      !target.includes(t) &&
      // 换词不能是书名/元词条（”写作一本通”混进术语池会造出荒谬题面）
      !/一本通|精讲|背诵|真题|方法论|写作|教材/.test(t) &&
      !/^[不无非没被把的]|^[一二三四五六七八九十]年?$/.test(t) &&
      Math.abs(t.length - target.length) <= 3,
  );
  if (candidates.length === 0) return null;
  // T5：换入词优先取"高频混淆对"（换《临时约法》进来比换无关词更能考查辨析），其余随机
  const preferred = preferConfusables(candidates, target);
  const swap = Math.floor(rand() * 10) < 6 && preferred[0] ? preferred[0] : candidates[Math.floor(rand() * candidates.length)];
  const mutated = text.replace(target, swap);
  if (mutated === text) return null;
  const trap: LawQuizTrap = looksLikePerson(target) || looksLikePerson(swap) ? "person" : isBook ? "book" : "term";
  return { text: mutated, trap };
}
