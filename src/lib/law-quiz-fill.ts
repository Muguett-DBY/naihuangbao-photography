/**
 * fill 填空题的答案归一化：全半角 / 空白 / 各式引号差异不影响判分。
 * 例：「诚实信用原则」/ “诚实信用 原则” / 诚实信用原则 都判对。
 */
export function normalizeFillText(input: string): string {
  return input
    // 全部空白（半角空格/全角空格/制表）先去掉
    .replace(/[\s\u3000]+/g, "")
    // 首尾包裹用的各式引号/书名号/方头括号（只剥包裹，不动词内字符；
    // ＂是全角引号 U+FF02，必须在下面的全角→半角转换前剥掉，否则转成 " 时错过剥离时机）
    .replace(/^[「」『』“”＂"'《》〈〉（）()【】\[\]]+/, "")
    .replace(/[「」『』“”＂"'《》〈〉（）()【】\[\]]+$/, "")
    // 尾部句读：用户答对了顺手带句号/顿号不该判错（答案本身经 isCleanTerm 无标点）
    .replace(/[。；：、，,.:]+$/, "")
    // 全角 ASCII（Ａ-Ｚａ-ｚ０-９与全角标点）→ 半角
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toLowerCase();
}

/** fill 判分：归一化后相等即对 */
export function fillMatches(input: string, answer: string): boolean {
  const a = normalizeFillText(input);
  return a.length > 0 && a === normalizeFillText(answer);
}
