// 法硕考研内容构建管线：
// 把 OCR 好的逐页文本解析为结构化 LawBook JSON（章节树 + 课时 + 动画步骤）。
// 保证：所有 OCR 文本行都必须落位（课时原文 raw 或 leftover），覆盖率不足会报警。
//
// 运行：node scripts/build-law-content.mjs
import { readFile, writeFile, readdir, mkdir, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const OCR_ROOT = join(root, ".tmp", "law-ocr");
const OUT_DIR = join(root, "src", "data", "law");

const BOOKS = [
  { id: "falixue", name: "法理学", fullName: "法理学背诵一本通", emoji: "⚖️", accent: "#6f9277", accentSoft: "#e7efe7" },
  { id: "xianfa", name: "宪法学", fullName: "宪法学背诵一本通", emoji: "🏛️", accent: "#b1544e", accentSoft: "#f6e5e2" },
  { id: "zhishixiang", name: "法制史", fullName: "法制史背诵一本通", emoji: "📜", accent: "#a9853f", accentSoft: "#f3ecd9" },
  { id: "minfa", name: "民法", fullName: "民法背诵一本通", emoji: "🏠", accent: "#5f7fae", accentSoft: "#e6ecf6" },
  { id: "xingfa", name: "刑法", fullName: "刑法背诵一本通", emoji: "🛡️", accent: "#96608f", accentSoft: "#efe6ee" },
];

// ── 正则模式 ──
const RE_PART = /^(第[一二三四五六七八九十百零0-9]+(编|部分|篇|卷)|(上|下|总|附)编|导\s*论(背诵误区与背诵方法)?|绪\s*论|总\s*论|分\s*论|附\s*论|专题[一二三四五六七八九十]+)/;
const RE_CHAPTER = /^第[一二三四五六七八九十百零0-9]+章/;
const RE_SECTION = /^第[一二三四五六七八九十百零0-9]+节/;
const RE_QUESTION = /^(?:第?[一二三四五六七八九十百零]{1,6}[、.]|\d{1,2}-\d{1,2}[.．、])/;
const RE_SUB = /^[（(][一二三四五六七八九十]{1,4}[)）]/;
const RE_LIST_ITEM = /^[①②③④⑤⑥⑦⑧⑨⑩]/;
const RE_NUM_ITEM = /^\d{1,2}[.、．]/;
const RE_PAGE_NO = /^\d{1,3}$/;

const HEADER_FOOTER = [
  /^法律.{1,4}考试.{1,4}一本通[·.。]/,
  /^连续$/,
  /^续表$/,
];

const FIXES = [
  ["自已", "自己"],
  ["壹、", "一、"],
  [" ", " "],
];

function isHeading(line) {
  if (RE_QUESTION.test(line) && line.length <= 40) return "question";
  if (RE_SUB.test(line) && line.length <= 40) return "sub";
  if (RE_NUM_ITEM.test(line) && line.length <= 40) return "num";
  return null;
}

function cleanLine(line) {
  let text = line.trim();
  for (const [from, to] of FIXES) text = text.split(from).join(to);
  if (HEADER_FOOTER.some((re) => re.test(text))) return "";
  if (RE_PAGE_NO.test(text)) return "";
  return text;
}

async function readPages(bookId) {
  const dir = join(OCR_ROOT, bookId);
  let files;
  try {
    files = (await readdir(dir)).filter((f) => /page-\d{5}\.txt$/.test(f)).sort();
  } catch {
    return []; // OCR 尚未完成
  }
  const pages = [];
  for (const file of files) {
    const content = await readFile(join(dir, file), "utf8");
    const pageNo = Number(file.match(/page-(\d{5})/)[1]);
    const lines = content
      .split("\n")
      .map(cleanLine)
      .filter((line) => line !== "");
    pages.push({ pageNo, lines });
  }
  return pages;
}

const META_TITLE = /^使用说明|^Instructions|^序\s*言|^前\s*言|^Preface|^作者的话|^绪\s*论|^导\s*论/i;

function isFrontMatterPage(page) {
  const lines = page.lines;
  const text = lines.join("\n");
  // 目录页：首行是"目录"，或同时出现多个章节标题与多个页码（目录续页）
  if (/^目录|^Contents/i.test(lines[0] ?? "")) return true;
  const chapterCount = lines.filter((line) => /^第[一二三四五六七八九十百零0-9]+[编章节]/.test(line)).length;
  const pageRefCount = lines.filter((line) => /^\/?[0-9]{1,3}$/.test(line)).length;
  if (chapterCount >= 2 && pageRefCount >= 2) return true;
  for (const line of lines) {
    if (RE_PART.test(line) || RE_CHAPTER.test(line) || RE_SECTION.test(line)) {
      return false;
    }
    if (/^使用说明|^Instructions/i.test(line)) return false;
  }
  return /图书在版编目|ISBN|目录|Contents|CHINA|Bei Song|中国石化|中国经济出版社|题名|责任编辑/.test(text);
}

function classifyChapterLevel(line) {
  if (RE_PART.test(line)) return "part";
  if (RE_CHAPTER.test(line)) return "chapter";
  if (RE_SECTION.test(line)) return "section";
  return "group";
}

function headingTitle(line, level, bookMeta) {
  let title = line
    .replace(/^第[一二三四五六七八九十百零0-9]+[编章节]/, "")
    .replace(/^[（(]?[一二三四五六七八九十]{1,6}[)）]?[、.]?/, "")
    .replace(/^[（(][一二三四五六七八九十]{1,4}[)）]/, "")
    .replace(/^\d{1,2}[.、]/, "")
    .trim();
  if (!title) title = line;
  return title;
}

function stripHeading(code, titleLine) {
  const title = titleLine
    .replace(/^[一二三四五六七八九十百零]{1,6}[、.]/, "")
    .replace(/^[（(][一二三四五六七八九十]{1,4}[)）]/, "")
    .replace(/^\d{1,2}[.、．]/, "")
    .replace(/^\d{1,2}-\d{1,2}[.、．]/, "")
    .trim();
  return title;
}

function joinParagraph(lines) {
  // 把断行拼成句：无终止标点的行合并到下一行；
  // 但遇到新条目开头（①/1./(一)）必须断段，避免把多条内容焊成一坨
  const out = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const startsNewItem =
      RE_LIST_ITEM.test(line) || RE_NUM_ITEM.test(line) || RE_SUB.test(line);
    const prev = out[out.length - 1];
    if (prev && !startsNewItem && !/[。！？；：”’』」]/.test(prev.trimEnd().slice(-1))) {
      out[out.length - 1] = prev + line;
    } else {
      out.push(line);
    }
  }
  return out;
}

function splitSentences(paragraph) {
  // 从长句中切分"…。①②…/（一）…"等混合内容
  const parts = paragraph
    .split(/(?<=。)(?=[①-⑨（(]|\d{1,2}[.、]|第[一二三四五六七八九十]{1,3}[条款])/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
  return parts.length > 0 ? parts : [paragraph];
}

function extractTerms(text) {
  const terms = [];
  const seen = new Set();
  const patterns = [
    /[“「《]([^”」》]{2,18})[”」》]/g,
    /([\u4e00-\u9fa5]{2,12})（([^）]{2,14})）/g,
  ];
  for (const re of patterns) {
    for (const match of text.matchAll(re)) {
      const term = (match[1] ?? match[2]).trim();
      if (term.length >= 2 && !seen.has(term)) {
        seen.add(term);
        terms.push({ term });
      }
    }
  }
  return terms.slice(0, 6);
}

function gatherMnemonic(lines) {
  for (const line of lines) {
    const match = line.match(/口诀[：:]?([^。；\n]{3,30})/);
    if (match) {
      const text = match[1].trim().replace(/^[①②③④⑤⑥⑦⑧⑨⑩]/g, "").trim();
      if (text.length >= 3) return text.slice(0, 30);
    }
    const match2 = line.match(/巧记|速记|记忆关键词|考记[：:]([^。；\n]{3,30})/);
    if (match2) return match2[1]?.trim().slice(0, 30);
  }
  return null;
}

function classifyStep(blockTexts, mnemonic) {
  const joined = blockTexts.join("；");
  if (mnemonic) return "mnemonic";
  // 至少有两条编号条目 → 列举型（可逐条点按）
  const numberedCount = blockTexts.filter(
    (part) => RE_LIST_ITEM.test(part.trim()) || RE_NUM_ITEM.test(part.trim()),
  ).length;
  if (numberedCount >= 2) return "list";
  if (/异同|相同点|不同点|区别|比较|区别于|相比/.test(joined)) return "compare";
  if (/要件|具备.*条件|构成要件|成立.*条件|\b必须\b/.test(joined) && /要件|条件/.test(joined)) return "condition";
  if (/但书|除外|例外|原则上|但是/.test(joined)) return "exception";
  if (/程序|步骤|先后|首先|其次|最后|依次|顺序/.test(joined)) return "flow";
  if (/朝代|公元前|公元\d{2,4}年|\d{3,4}年/.test(joined)) return "timeline";
  if (/是指|指，|指\w{2,}|是[\u4e00-\u9fa5]{2,12}的总称|即[\u4e00-\u9fa5]/.test(joined)) return "definition";
  if (/包括|分为|有[\u4e00-\u9fa5]{2,8}种|如下|以下/.test(joined)) return "list";
  return "plain";
}

function buildSteps(blocks, mnemonic) {
  const steps = [];
  for (const block of blocks) {
    const texts = block.items.length > 0 ? block.items : block.texts;
    const kind = classifyStep(texts, block.mnemonic ?? null);
    const step = {
      id: "",
      kind,
      text: texts.join("；"),
      parts: texts.length >= 2 ? texts.slice(0, 8) : undefined,
      terms: extractTerms(texts.join("")),
    };
    if (block.mnemonic) step.mnemonic = block.mnemonic;
    steps.push(step);
  }
  return steps;
}

function makeLesson(bookMeta, seq, line, stack) {
  const code =
    line.match(/^([一二三四五六七八九十百零]{1,6})[、.]/)?.[1] ??
    line.match(/^(\d{1,2}-\d{1,2})/)?.[1] ??
    String(seq);
  const title = stripHeading(code, line) || line;
  return {
    id: `${bookMeta.id}-q${String(seq).padStart(3, "0")}`,
    subject: bookMeta.id,
    code,
    breadcrumb: stack.map((h) => headingTitle(h.title, h.level, bookMeta)),
    title,
    intro: "",
    steps: [],
    pageRange: [0, 0],
    raw: [],
  };
}

function parseBookPages(pages, bookMeta) {
  const chapters = [];
  const leftovers = [];
  const rawTrail = [];
  let stack = []; // part/chapter/section 层级栈（breadcrumb）
  let lesson = null;
  let lessonBody = [];
  let lessonStartPage = 0;
  let lessonEndPage = 0;
  let seq = 0;
  let metaLesson = null;
  let metaLessonBody = [];
  let metaLessonStartPage = 0;
  let metaLessonEndPage = 0;
  let trailStartPage = 0;
  let trailEndPage = 0;

  const currentGroup = () => chapters[chapters.length - 1];

  const ensureGroup = (title, level) => {
    if (!currentGroup()) {
      chapters.push({ id: `${bookMeta.id}-c0`, title: title || "全书", level, lessons: [] });
    }
  };

  const flushLesson = () => {
    if (!lesson) return;
    const paragraphs = joinParagraph(lessonBody);
    const blocks = [];
    const hasItemPrefix = (block) => {
      const first = block.items[0] ?? block.texts[0] ?? "";
      return RE_LIST_ITEM.test(first) || RE_NUM_ITEM.test(first);
    };
    for (const line of paragraphs) {
      if (RE_SUB.test(line)) {
        blocks.push({ items: [line], texts: [] });
        continue;
      }
      if (RE_LIST_ITEM.test(line) || RE_NUM_ITEM.test(line)) {
        const last = blocks[blocks.length - 1];
        if (last && hasItemPrefix(last)) {
          last.items.push(line);
        } else {
          blocks.push({ items: [line], texts: [] });
        }
        continue;
      }
      if (blocks.length === 0) blocks.push({ items: [], texts: [] });
      const block = blocks[blocks.length - 1];
      // 列表内容行跟在列表项后 → 归入该列表
      if (block.items.length > 0 && block.texts.length === 0) {
        block.items.push(line);
      } else {
        block.texts.push(line);
      }
    }
    const mnemonic = gatherMnemonic(paragraphs);
    const rawSteps = buildSteps(blocks, mnemonic)
      .filter((s) => s.text && s.text.trim().length >= 2);
    // 超长步骤按句切分，保证一屏能读完（"傻子也能看懂"）
    const splitSteps = [];
    for (const step of rawSteps) {
      if (step.text.length <= 300) {
        splitSteps.push(step);
        continue;
      }
      const sentences = step.text.split(/(?<=[。！？；])/).filter((s) => s.trim().length >= 2);
      let buffer = "";
      for (const sentence of sentences) {
        if (buffer.length + sentence.length > 190 && buffer.length > 0) {
          splitSteps.push({
            ...step,
            kind: "plain",
            text: buffer,
            parts: undefined,
            timeline: undefined,
            compare: undefined,
            pivot: undefined,
          });
          buffer = sentence;
        } else {
          buffer += sentence;
        }
      }
      if (buffer) {
        splitSteps.push({
          ...step,
          kind: "plain",
          text: buffer,
          parts: undefined,
          timeline: undefined,
          compare: undefined,
          pivot: undefined,
        });
      }
    }
    const steps = splitSteps.map((s, index) => ({ ...s, id: `${lesson.id}-s${index}` }));
    if (steps.length === 0) {
      // 本课没有可成步骤的行 → 保留原文，防止丢内容
      lesson.steps = [
        {
          id: `${lesson.id}-s0`,
          kind: "plain",
          text: lessonBody.join("；") || lesson.title,
          terms: [],
        },
      ];
    } else {
      lesson.steps = steps;
    }
    lesson.intro = lessonBody[0] ?? lesson.steps[0]?.text ?? "";
    lesson.mnemonic = mnemonic ?? undefined;
    lesson.pageRange = [lessonStartPage, lessonEndPage || lessonStartPage];
    lesson.raw = [...lessonBody];
    if (currentGroup()) {
      currentGroup().lessons.push(lesson);
    } else {
      leftovers.push({ page: lessonStartPage, text: lessonBody.join("\n") });
    }
    lesson = null;
    lessonBody = [];
  };

  /** 序言/使用说明 课时的收尾（与普通课时共用构造逻辑） */
  const flushMetaLesson = () => {
    if (!metaLesson) return;
    lesson = metaLesson;
    lessonBody = metaLessonBody;
    lessonStartPage = metaLessonStartPage;
    lessonEndPage = metaLessonEndPage;
    flushLesson();
    metaLesson = null;
    metaLessonBody = [];
  };

  /** 把排队中的散行（思维导图/编前导览等）打包成「章节导览」课时，确保内容不丢 */
  const flushTrail = () => {
    if (rawTrail.length === 0 || !currentGroup()) return;
    seq += 1;
    const trailLesson = makeLesson(bookMeta, seq, "导览", stack);
    trailLesson.id = `${bookMeta.id}-q${String(seq).padStart(3, "0")}-tour`;
    const topTitle = stack.length > 0
      ? headingTitle(stack[stack.length - 1].title, stack[stack.length - 1].level, bookMeta)
      : "本章";
    trailLesson.title = `导览：${topTitle}`;
    const chunked = [];
    let buffer = "";
    for (const line of rawTrail) {
      if (buffer.length + line.length > 160 && buffer.length > 0) {
        chunked.push(buffer);
        buffer = line;
      } else {
        buffer = buffer ? `${buffer}；${line}` : line;
      }
    }
    if (buffer) chunked.push(buffer);
    trailLesson.steps = chunked.map((text, index) => ({
      id: `${trailLesson.id}-s${index}`,
      kind: "plain",
      text,
      terms: [],
    }));
    trailLesson.intro = rawTrail[0] ?? "";
    trailLesson.raw = [...rawTrail];
    trailLesson.pageRange = [trailStartPage, trailEndPage || trailStartPage];
    currentGroup().lessons.push(trailLesson);
    rawTrail.length = 0;
  };

  /** 去除页眉装饰符号并压缩为"N 级编号"，用于识别"同一标题" */
  const normalizeHeading = (line) => {
    const match = line.match(/^(第[一二三四五六七八九十百零0-9]+[编部分章篇卷]|专题[一二三四五六七八九十]+)/);
    return match ? match[1] : line.replace(/[○◎●◆・•·\s]/g, "");
  };

  let partGroups = new Map(); // 键 = 第X编/部分 编号
  let chapterGroups = new Map(); // 键 = 第X章 编号，随新编重置

  /** 编/章级标题：同一编号（含运行页眉变体）合并进同一个组，选更完整的标题 */
  const onHeading = (line, level, indexInPage, pageNo, prevPageTopKeys, tocLike) => {
    if (level !== "part" && level !== "chapter") {
      flushLesson();
      flushMetaLesson();
      flushTrail();
      stack = stack.filter((h) => levelRank(h.level) < levelRank(level));
      stack.push({ title: line, level });
      return;
    }
    if (tocLike) return;
    const key = normalizeHeading(line);
    if (indexInPage <= 2 && pageNo > 1 && prevPageTopKeys.has(key)) {
      // 上一页顶部出现过同一编号 → 运行页眉，跳过
      return;
    }
    if (level === "part") {
      if (!partGroups.has(key)) {
        chapterGroups = new Map();
        flushLesson();
        flushMetaLesson();
        flushTrail();
        stack = stack.filter((h) => levelRank(h.level) < levelRank(level));
        stack.push({ title: line, level });
        const group = {
          id: `${bookMeta.id}-c${chapters.length}`,
          title: headingTitle(line, level, bookMeta),
          level,
          lessons: [],
        };
        chapters.push(group);
        partGroups.set(key, group);
      } else {
        // 同一编再次出现：选更完整的标题，面包屑更新，不建新组
        const title = headingTitle(line, level, bookMeta);
        const prior = partGroups.get(key);
        if (/^第[编部分]*$/.test(prior.title) && title && title.length >= 2) {
          prior.title = title;
        }
        stack = stack.filter((h) => levelRank(h.level) < levelRank(level));
        stack.push({ title: line, level });
      }
      return;
    }
    // chapter
    if (chapterGroups.has(key)) {
      const title = headingTitle(line, level, bookMeta);
      const prior = chapterGroups.get(key);
      if (/^第[编部分]*$/.test(prior.title) && title && title.length >= 2) {
        prior.title = title;
      }
      stack = stack.filter((h) => levelRank(h.level) < levelRank(level));
      stack.push({ title: line, level });
      return;
    }
    flushLesson();
    flushMetaLesson();
    flushTrail();
    stack = stack.filter((h) => levelRank(h.level) < levelRank(level));
    stack.push({ title: line, level });
    const group = {
      id: `${bookMeta.id}-c${chapters.length}`,
      title: headingTitle(line, level, bookMeta),
      level,
      lessons: [],
    };
    chapters.push(group);
    chapterGroups.set(key, group);
  };

  let prevPageTopKeys = new Set();
  let prevPageNo = 0;

  for (const page of pages) {
    if (isFrontMatterPage(page)) {
      leftovers.push({ page: page.pageNo, text: page.lines.join("\n") });
      prevPageTopKeys = new Set(page.lines.slice(0, 3).map(normalizeHeading));
      prevPageNo = page.pageNo;
      continue;
    }

    // 使用说明 / 序言 / 前言：连续页合成一个「作者的话」课时
    if (META_TITLE.test(page.lines[0] ?? "")) {
      flushLesson();
      if (!metaLesson) {
        if (!currentGroup()) {
          chapters.push({ id: `${bookMeta.id}-c0`, title: "作者的话", level: "chapter", lessons: [] });
        }
        flushMetaLesson();
        stack = [{ title: "作者的话", level: "chapter" }];
        seq += 1;
        metaLesson = makeLesson(bookMeta, seq, "作者的话", stack);
        metaLesson.title = page.lines[0];
        metaLessonStartPage = page.pageNo;
      }
      metaLessonBody.push(...page.lines.slice(1));
      metaLessonEndPage = page.pageNo;
      continue;
    }

    // 序言/使用说明 的续页：只要无标题行就算续页内容
    if (metaLesson) {
      const hasHeading = page.lines.some(
        (line) => classifyChapterLevel(line) !== "group" || RE_QUESTION.test(line),
      );
      if (!hasHeading) {
        metaLessonBody.push(...page.lines);
        metaLessonEndPage = page.pageNo;
        continue;
      }
    }

    // 目录/导览式罗列页：同页出现 3 个及以上不同编章标题 → 不建组
    const tocLikePage =
      new Set(
        page.lines
          .filter((line) => classifyChapterLevel(line) !== "group")
          .map(normalizeHeading),
      ).size >= 3;

    for (let lineIndex = 0; lineIndex < page.lines.length; lineIndex += 1) {
      const line = page.lines[lineIndex];
      let level = classifyChapterLevel(line);
      const isQuestion = RE_QUESTION.test(line) && line.length <= 46;
      const isSub = RE_SUB.test(line) && line.length <= 46;

      if (level !== "group" && !isQuestion) {
        // 编/章/节标题
        onHeading(line, level, lineIndex, page.pageNo, prevPageTopKeys, tocLikePage);
        continue;
      }

      if (isQuestion) {
        flushLesson();
        flushMetaLesson();
        flushTrail();
        ensureGroup(
          stack.length > 0 ? headingTitle(stack[stack.length - 1].title, stack[stack.length - 1].level, bookMeta) : "全书",
          stack.length > 0 ? stack[stack.length - 1].level : "group",
        );
        seq += 1;
        lesson = makeLesson(bookMeta, seq, line, stack);
        lessonStartPage = page.pageNo;
        lessonEndPage = page.pageNo;
        continue;
      }

      if (isSub && lesson) {
        lessonBody.push(line);
        lessonEndPage = page.pageNo;
        continue;
      }

      if (lesson) {
        lessonBody.push(line);
        lessonEndPage = page.pageNo;
      } else {
        // 没有任何课时之前的散行 → 先排队，最终作为「导览」课时或附录保留
        if (!trailStartPage) trailStartPage = page.pageNo;
        trailEndPage = page.pageNo;
        rawTrail.push(line);
      }
    }
    prevPageTopKeys = new Set(page.lines.slice(0, 3).map(normalizeHeading));
    prevPageNo = page.pageNo;
  }
  flushLesson();
  flushMetaLesson();
  if (rawTrail.length > 0) {
    leftovers.push({ page: 0, text: rawTrail.join("\n") });
  }
  return { chapters, leftovers };
}

function levelRank(level) {
  return level === "part" ? 0 : level === "chapter" ? 1 : level === "section" ? 2 : 3;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(join(root, ".tmp", "law-build"), { recursive: true });
  const stats = {};
  const summary = [];

  for (const bookMeta of BOOKS) {
    const pages = await readPages(bookMeta.id);
    const parsed = parseBookPages(pages, bookMeta);
    // 去掉没有任何课时的空组（目录页装饰性标题产生）
    parsed.chapters = parsed.chapters.filter((chapter) => chapter.lessons.length > 0);
    const { chapters, leftovers } = parsed;
    const lessonsCount = chapters.reduce((sum, c) => sum + c.lessons.length, 0);
    const stepsCount = chapters.reduce(
      (sum, c) => sum + c.lessons.reduce((s, l) => s + l.steps.length, 0),
      0,
    );
    const leftoverLines = leftovers.reduce((sum, p) => sum + p.text.split("\n").length, 0);
    const ocrLines = pages.reduce((sum, p) => sum + p.lines.length, 0);
    const lessonLines = chapters.reduce(
      (sum, c) => sum + c.lessons.reduce((s, l) => s + l.raw.length, 0),
      0,
    );
    const coverage = (lessonLines + leftoverLines) / Math.max(ocrLines, 1);
    console.log(
      `${bookMeta.name}: pages=${pages.length} ocrLines=${ocrLines} lessons=${lessonsCount} steps=${stepsCount} 「lesson=${lessonLines} leftover=${leftoverLines}」coverage=${(coverage * 100).toFixed(2)}%`,
    );

    const leftoverText = leftovers.map((p) => `【第 ${p.page} 页】\n${p.text}`).join("\n\n");
    await writeFile(
      join(root, ".tmp", "law-build", `leftover-${bookMeta.id}.txt`),
      leftoverText || "（无）",
      "utf8",
    );
    const book = {
      id: bookMeta.id,
      name: bookMeta.name,
      fullName: bookMeta.fullName,
      emoji: bookMeta.emoji,
      accent: bookMeta.accent,
      accentSoft: bookMeta.accentSoft,
      chapters,
      lessonCount: lessonsCount,
      leftover: leftovers.length > 0 ? [leftoverText] : [],
    };

    await writeFile(
      join(OUT_DIR, `${bookMeta.id}.json`),
      `${JSON.stringify({ book }, null, 1)}\n`,
      "utf8",
    );
    stats[bookMeta.id] = {
      lessonCount: lessonsCount,
      chapterTitles: chapters.map((c) => c.title),
    };
    summary.push(
      `${bookMeta.name}: ${lessonsCount}课 / ${stepsCount}步 / leftover ${leftoverLines}行`,
    );
  }

  await writeFile(join(OUT_DIR, "stats.json"), `${JSON.stringify(stats, null, 2)}\n`, "utf8");
  await writeFile(
    join(root, ".tmp", "law-build", "summary.txt"),
    summary.join("\n"),
    "utf8",
  );
  console.log("done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
