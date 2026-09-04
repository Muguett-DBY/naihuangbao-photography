// 全量审计：逐课检查知识点质量、题目一致性、歧义与功能逻辑
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { buildQuiz } from "../src/lib/law-quiz";
import type { LawBook, LawLesson } from "../src/types/law";

const root = resolve(import.meta.dirname, "..");
const books: Record<string, LawBook> = {};
for (const id of ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"]) {
  books[id] = JSON.parse(readFileSync(resolve(root, `src/data/law/${id}.json`), "utf8")).book;
}
const all = Object.values(books).flatMap((b) => b.chapters.flatMap((c) => c.lessons));

const issues: { level: "high" | "mid" | "low"; type: string; lessonId: string; note: string }[] = [];
const push = (level, type, lessonId, note) => issues.push({ level, type, lessonId, note });
let shells = 0;

/** 可疑 OCR 残渣字符（口/字母OoCc 是真实汉字/字母的一部分，如"牲口/China"，不算残渣） */
const SUSPICIOUS = /[〇○□Q][一-龥]/;
const LATIN_RUN = /[A-Za-z]{4,}/;
const LATIN_WORDS_OK = /^(Whig|Tory|Whigs|Tories|Feel|True|False|Note|What|five|one|two|three|CHAPTER|Chapter|Sino|China|Law|when|what|where|how)$/;
const BAD_SYMBOL = /[　]{2,}|[\uFFFD]/;
/** 纯序号占位章节标题（无语义名不算问题） */
const ORDINAL_TITLE = /^(第[一二三四五六七八九十百零0-9]+(编|部分|章|篇|卷)?|上编|下编|附编|作者的话|使用说明)$/;

for (const lesson of all) {
  const text = lesson.steps.map((s) => s.text).join("");
  const title = lesson.title;
  // 1) 可疑字符
  if (SUSPICIOUS.test(title)) push("high", "suspicious-title", lesson.id, title.slice(0, 30));
  const latinMatch = LATIN_RUN.exec(text);
  if (latinMatch && !LATIN_WORDS_OK.test(latinMatch[0])) {
    push("mid", "latin-run", lesson.id, latinMatch[0].slice(0, 20));
  }
  if (BAD_SYMBOL.test(text)) push("mid", "bad-symbol", lesson.id, "含异常字符");
  if (/^\s*$/.test(title)) push("high", "empty-title", lesson.id, "标题为空");
  // 2) 内容过短/缺原文：索引空壳课（shell 标记）是已知形态；未标记却缺原文 = 真丢内容，HIGH
  if (lesson.raw.length === 0) {
    if (lesson.shell) {
      shells += 1;
    } else {
      push("high", "no-raw", lesson.id, "无原文行且未标记 shell");
    }
  }
  // 3) 步骤类型与文本不匹配（宽松）
  for (const step of lesson.steps) {
    const t = step.text;
    if (step.kind === "definition" && !/[是指即，]/.test(t) && t.length > 4) {
      push("low", "kind-definition", lesson.id, step.text.slice(0, 40));
    }
    if (step.kind === "timeline" && !/\d{3,4}|朝代|时期/.test(t)) {
      push("low", "kind-timeline", lesson.id, step.text.slice(0, 40));
    }
    if (step.kind === "compare" && !/[异同|区别|相比|比较]/.test(t)) {
      push("low", "kind-compare", lesson.id, step.text.slice(0, 40));
    }
  }
  // 4) 题目一致性
  const quiz = buildQuiz(lesson);
  const lessonText = text;
  for (const item of quiz) {
    if (item.kind === "mcq") {
      const options = item.options ?? [];
      if (new Set(options).size !== options.length) {
        push("high", "quiz-duplicate-options", lesson.id, item.prompt.slice(0, 30));
      }
      // 答案必须出自本课
      if (!lessonText.includes(item.answer) && !lesson.raw.join("").includes(item.answer)) {
        push("high", "quiz-answer-not-in-lesson", lesson.id, `答案「${item.answer}」不在课文中`);
      }
      // 歧义检测：干扰项出现在题面（含挖空位置后的正文）→ 可能两个候选都对
      for (const option of options) {
        if (option === item.answer) continue;
        if (item.prompt.includes(option)) {
          push("mid", "quiz-ambiguous-option", lesson.id, `干扰项「${option}」也在题面中出现；题面：${item.prompt.slice(0, 40)}`);
        }
      }
    }
    if (item.kind === "judge") {
      // 判断题两种合法形态：改年份错句（解释含"书上说的是："）或原句重现（答案"是"）
      const tokens = item.explain;
      const promptText = item.prompt;
      if (item.answer === "是") {
        // 原句判断：题面引号内必须是本课原文
        const quoted = promptText.match(/「(.+)」/s)?.[1];
        if (!quoted || (!lessonText.includes(quoted) && !lesson.raw.join("").includes(quoted))) {
          push("high", "quiz-judge-verbatim-not-in-lesson", lesson.id, "原句判断题的句子不在课文中");
        }
      } else if (!tokens.includes("书上说的是")) {
        push("mid", "quiz-judge-explain", lesson.id, "解释不含原句标记");
      }
      if (promptText === tokens) {
        push("high", "quiz-judge-same-as-original", lesson.id, "判断题与原文完全相同");
      }
    }
    if (item.kind === "order") {
      const order = item.order ?? [];
      if (new Set(order).size !== order.length) {
        push("high", "quiz-order-duplicate", lesson.id, "排序项重复");
      }
      for (const part of order) {
        if (!lessonText.includes(part.slice(0, 6))) {
          push("mid", "quiz-order-not-in-lesson", lesson.id, `排序项「${part.slice(0, 10)}」不在课文`);
        }
      }
    }
  }
}

// 5) 功能逻辑：章节语义名缺失（纯序号标题与元信息章节除外）
const missingSemantic = Object.values(books).flatMap((book) =>
  book.chapters
    .filter((c) => !c.semanticTitle && c.lessons.length > 1 && !ORDINAL_TITLE.test(c.title.trim()))
    .map((c) => ({ id: `${book.id}/${c.id}`, note: `章节「${c.title}」无语义名(章节含${c.lessons.length}课)` })),
);

// 6) 统计
const kindCount: Record<string, number> = {};
for (const lesson of all) {
  for (const step of lesson.steps) kindCount[step.kind] = (kindCount[step.kind] ?? 0) + 1;
}
const quizCount = all.reduce((sum, lesson) => sum + buildQuiz(lesson).length, 0);

const report = {
  totalLessons: all.length,
  quizItems: quizCount,
  kindCount,
  issues: issues.slice(0, 400),
  missingSemantic,
  counts: {
    high: issues.filter((i) => i.level === "high").length,
    mid: issues.filter((i) => i.level === "mid").length,
    low: issues.filter((i) => i.level === "low").length,
    total: issues.length,
  },
};

mkdirSync(resolve(root, ".tmp/law-build"), { recursive: true });
writeFileSync(resolve(root, ".tmp/law-build/audit.json"), JSON.stringify(report, null, 1), "utf8");

console.log(`总课: ${all.length} | 总题: ${quizCount} | 索引空壳: ${shells}`);
console.log("问题统计:", JSON.stringify(report.counts));
console.log("步骤类型:", JSON.stringify(kindCount));
console.log("缺语义名章节:", missingSemantic.length);
console.log("HIGH 问题明细:");
for (const issue of issues.filter((i) => i.level === "high").slice(0, 40)) {
  console.log(`  - [${issue.type}] ${issue.lessonId}: ${issue.note.slice(0, 70)}`);
}
console.log("MID 抽样:");
for (const issue of issues.filter((i) => i.level === "mid").slice(0, 25)) {
  console.log(`  - [${issue.type}] ${issue.lessonId}: ${issue.note.slice(0, 80)}`);
}
