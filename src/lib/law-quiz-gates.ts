/** 出题取材闸门：词项/判断句/排序卡的干净度判定（从 law-quiz.ts 抽出，纯函数无状态） */
import { isCleanTerm } from "../types/law";

/** 选项组里不允许互为子串（如"国家监督"与"国家监督是"同场出现，无法作答） */
export function optionsAreDistinct(options: string[]): boolean {
  for (let i = 0; i < options.length; i += 1) {
    for (let j = 0; j < options.length; j += 1) {
      if (i === j) continue;
      const [a, b] = [options[i], options[j]];
      if (a.length >= 2 && b.includes(a)) return false;
    }
  }
  return true;
}

/** 清洗后的候选术语：太短/含 OCR 残渣/纯数字/口诀速记串的都不要 */
export function cleanTerm(term: string | null | undefined): string | null {
  if (!term) return null;
  const text = term.trim().replace(/^[（(【[]|[）)】\]]$/g, "").trim();
  if (!isCleanTerm(text)) return null;
  // 口诀速记串（"40、20、永、无、中"）：多个超短顿号分段是记忆码不是概念
  const segs = text.split(/[、，]/);
  if (segs.length >= 3 && segs.every((s) => s.trim().length <= 4)) return null;
  // 长词项以功能词收尾（"主体一般立功的主体只能"）= 表格焊接碎片不是概念
  if (text.length >= 6 && /(只能|皆是|均为|指的是?|是指)$/u.test(text)) return null;
  return text;
}

/** 判断题"原句重现"取材：必须是完整独立句，不带 OCR 残渣 */
export function isCleanVerbatimSentence(sentence: string): boolean {
  // 必须以句末标点收尾（截断残句如"…社会规范，具"不可用作判断题）
  if (!/[。！？]$/.test(sentence)) return false;
  // 不含嵌套引号/书名号/OCR 方括号（包进「」后显示混乱）
  if (/["“”「」『』《》［\[\]］]/.test(sentence)) return false;
  // 不以编号/条目符开头（那是列表残段，不是一句完整的话）
  if (/^[①-⑨（(\d]/.test(sentence)) return false;
  // 行内夹"（1）（二）"编号 = 表格行焊接残段（"法人名义（1）超越法定权限。"）
  if (/[（(][0-9一二三四五六七八九]{1,2}[)）]/.test(sentence)) return false;
  // "含义/概述"开头的表格行标签焊接（"含义拾得迪失物、指…"）
  if (/^(含义|概述)/.test(sentence)) return false;
  // OCR 糊字：□○ 等占位符直接排除；〇 仅在年份里合法（"二〇二五"的〇后是〇/数字/年），
  // "算二〇典合国"这类〇后接普通汉字的糊句拿去出判断题无法作答
  if (/[○□◊]/.test(sentence)) return false;
  if (sentence.includes("〇") && !/〇(?=[〇0-9年])/.test(sentence)) return false;
  return true;
}

/**
 * 判断题"变错"取材：与原句重现不同源——允许《书名》与"引号术语"（术语替换变异正需要它们），
 * 其余干净标准与原句一致。没有这个池子，替换变异永远找不到句子（死代码）。
 */
export function isMutableSentence(sentence: string): boolean {
  if (!/[。！？]$/.test(sentence)) return false;
  // 拒绝直角引号与方括号（包进「」展示混乱）；弯/直双引号允许——术语替换变异需要它们
  if (/[「」『』［\[\]］]/.test(sentence)) return false;
  if (/^[①-⑨（(\d]/.test(sentence)) return false;
  // 孤儿引号（"”1789年的法国…"开头闭引号）：OCR 残渣句
  if (/^[”’」』》]/.test(sentence) || /[‘“「《]$/.test(sentence)) return false;
  // 书名号不配对 = 句子被截断（"代表法典有《汉谟拉比法典》《十二。"）
  if ((sentence.match(/《/g) ?? []).length !== (sentence.match(/》/g) ?? []).length) return false;
  // 句中夹"（1）（二）"式列表残段 = 双栏焊接句，读不通，不配当题面
  if (/[一-龥]["“]?[（(][0-9一二三四五六七八九]{1,2}[)）]/.test(sentence)) return false;
  // 汉字直贴年份（"…法律的特权1954年《宪法》…"）= 无句读焊接句；"公元1908年"合法放行
  if (/(?<!元)[一-龥]\d{4}年/.test(sentence)) return false;
  // 元信息句（真题设问/背诵方法标注）是书的排版家具不是考点
  if (
    /设问[：:]|真题|材料分析题|考试分析原文|背诵提示|背诵口诀|拆解法|填充法|常识法|类比法|接地气|一招制敌|表达逻辑|记忆主线/.test(
      sentence,
    )
  )
    return false;
  if (/[○□◊]/.test(sentence)) return false;
  if (sentence.includes("〇") && !/〇(?=[〇0-9年])/.test(sentence)) return false;
  return true;
}

/** 排序题条目的乱码闸门：读不通的条目不配上题面（宁可这课不出排序题） */
export function isGarbledOrderPart(part: string): boolean {
  if (/[a-zA-Z]/.test(part)) return true; // 拉丁残渣（Who/shr）——正文知识词不进排序卡
  if (/考试|一本[通迹庙植遍迪]|一木[通庙]|专试|考过|昔楠|弯试/.test(part)) return true; // 页眉糊字
  if (/第[大小宽二王三四五六七八九十]{1,3}[童意亿审]/.test(part)) return true; // 糊版章名
  if (/、{2,}/.test(part)) return true; // 顿号丢字
  if (!/^[一-龥“「《（]|\d{3,4}年/.test(part)) return true; // 首字符异常（年份开头合法，如"1787年《美国宪法》…"）
  if (/[：:，；]$/.test(part)) return true; // 以逗号/冒号/分号收尾 = 半截句（句号结尾是完整句，放行）
  if (/来背诵[。.]?$/.test(part)) return true; // 口诀解说尾巴焊进行条（"…顺序（西夏、金、南宋）来背诵。"）
  return false;
}

/** 排序卡文本规整：剥离页边［注记］（"接受法律监督［保民］"→"接受法律监督"） */
export function cleanOrderPart(part: string): string {
  return part.replace(/［[^［］]{1,8}］/g, "").trim();
}

/** 卡组里任何一张卡是另一张的子串 → 组内有断头残卡（"督宪法的实"⊂"监督宪法的实施"），整组不可用 */
export function hasFragmentCard(cards: string[]): boolean {
  const bare = cards.map((c) => c.replace(/[。．.，、；：:！？?]\s*$/, ""));
  for (let i = 0; i < bare.length; i += 1) {
    for (let j = 0; j < bare.length; j += 1) {
      if (i === j || bare[i].length < 4) continue;
      if (bare[j] !== bare[i] && bare[j].includes(bare[i])) return true;
    }
  }
  return false;
}
