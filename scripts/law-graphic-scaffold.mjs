#!/usr/bin/env node
/**
 * 图解工厂脚手架（S5）
 * 让"新增一个图解"的成本从 30 分钟降到 10 分钟：
 *
 *   node scripts/law-graphic-scaffold.mjs --find 关键词          # 选题：在五本 JSON 里找"简述/论述 X"真实课时
 *   node scripts/law-graphic-scaffold.mjs --anchor minfa-q100    # 校验锚点 + 提取原文要点 + 打印骨架
 *   node scripts/law-graphic-scaffold.mjs --anchor minfa-q100 --kind flow --insert
 *                                                                 # 生成骨架并直接追加进 graphicsS5.ts（带 S5-DRAFT 标记）
 *   node scripts/law-graphic-scaffold.mjs --quota                # 五科配额缺口报告
 *
 * 内容红线：骨架 captions/nodes 预填的是课时原文要点（待人工精炼），
 * 带 "S5-DRAFT" 标记的条目不允许上线——law-content.test.ts 图解段会拦截。
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const LAW_DATA_DIR = resolve(ROOT, "src/data/law");
const GRAPHICS_FILE = resolve(LAW_DATA_DIR, "graphics.ts");
/** 图解条目分布在多个批次文件：CORE + E 扩展 + S5 扩产（架构预算 500 行/文件，按余量选插入目标） */
const GRAPHIC_SOURCES = [
  GRAPHICS_FILE,
  resolve(LAW_DATA_DIR, "graphicsExtended.ts"),
  resolve(LAW_DATA_DIR, "graphicsS5.ts"),
  resolve(LAW_DATA_DIR, "graphicsS5B.ts"),
  resolve(LAW_DATA_DIR, "graphicsS5C.ts"),
];
/** 新骨架的插入目标：第一个行数有余量（<460）的 S5 批次文件 */
function pickTargetFile() {
  for (const file of GRAPHIC_SOURCES.slice(2)) {
    if (readFileSync(file, "utf8").split("\n").length < 460) return file;
  }
  throw new Error("S5 批次文件都接近 500 行架构预算——请新建 graphicsS5C.ts 并加入 GRAPHIC_SOURCES");
}
const TARGET_FILE = pickTargetFile();

const SUBJECTS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"];
const SUBJECT_NAMES = { falixue: "法理学", xianfa: "宪法学", zhishixiang: "法制史", minfa: "民法", xingfa: "刑法" };
/** T2 配额目标：每科下限 */
const QUOTA_TARGETS = { minfa: 9, xianfa: 9, zhishixiang: 8, falixue: 8, xingfa: 10 };
const KINDS = ["assemble", "flow", "tree", "timeline", "balance", "stairs", "matrix"];
const KIND_LABELS = {
  assemble: "装配", flow: "流程", tree: "体系树", timeline: "时间轴",
  balance: "天平", stairs: "阶梯", matrix: "对照矩阵",
};

// ─────────────────────────── 数据加载 ───────────────────────────

function loadBooks() {
  const books = {};
  for (const subject of SUBJECTS) {
    const file = resolve(LAW_DATA_DIR, `${subject}.json`);
    if (!existsSync(file)) throw new Error(`找不到 ${file}`);
    books[subject] = JSON.parse(readFileSync(file, "utf8")).book;
  }
  return books;
}

function allLessons(books) {
  return Object.values(books).flatMap((book) => book.chapters.flatMap((c) => c.lessons));
}

/** 与 src/types/law.ts isShellLesson 同口径 */
function isShellLesson(lesson) {
  if (lesson.shell) return true;
  return lesson.raw.length === 0 && lesson.steps.length <= 1 && lesson.steps[0]?.text === lesson.title;
}

function existingGraphics() {
  const source = GRAPHIC_SOURCES.map((file) => readFileSync(file, "utf8")).join("\n");
  const ids = [...source.matchAll(/lessonId:\s*"([^"]+)"/g)].map((m) => m[1]);
  const subjects = {};
  for (const subject of SUBJECTS) {
    subjects[subject] = [...source.matchAll(/lessonId:\s*"([^"]+)"[\s\S]{0,120}?subject:\s*"([^"]+)"/g)]
      .filter((m) => m[2] === subject).length;
  }
  return { ids, subjects };
}

// ─────────────────────────── 选题检索 ───────────────────────────

function findLessons(books, keyword) {
  const hits = [];
  for (const lesson of allLessons(books)) {
    const inTitle = lesson.title.includes(keyword);
    const inIntro = (lesson.intro ?? "").includes(keyword);
    if (!inTitle && !inIntro) continue;
    hits.push({ lesson, score: (inTitle ? 2 : 0) + (/简述|论述|试述/.test(lesson.title) ? 1 : 0) });
  }
  return hits.sort((a, b) => b.score - a.score);
}

// ─────────────────────────── 要点提取 ───────────────────────────

/** 从课时 steps.parts / raw 提取编号要点句（图解 captions 的原始素材） */
function extractPoints(lesson) {
  const points = [];
  const seen = new Set();
  const push = (text) => {
    text = text.trim();
    if (text.length < 8 || text.length > 220) return;
    // 标题尾部年份括号被 OCR 切出的碎片（"分析、2019分析论述…"）不是考点
    if (/^(分析|论述|简答|简析|法条|案例)[、，／\d]/.test(text)) return;
    const key = text.slice(0, 24);
    if (seen.has(key)) return;
    seen.add(key);
    points.push(text);
  };
  // steps.parts 是管线焊接好的要点，优先采用
  for (const step of lesson.steps) {
    for (const part of step.parts ?? []) push(part);
  }
  // 无 parts：把 raw 双栏碎片焊接回全文，按句号/分号切出整句
  if (points.length === 0) {
    const welded = lesson.raw.join("");
    for (const sentence of welded.split(/(?<=[。；!?])/)) {
      push(sentence.replace(/^\s*[0-9０-９]+[．.、]\s*/, ""));
    }
  }
  return points;
}

/** OCR 常见残词/焊接嗅探：提醒人工核对原 PDF */
function ocrRisk(text) {
  const risks = [];
  if (/[0-9]{4,}/.test(text)) risks.push("长数字串");
  if (/[,.;:!?]/.test(text)) risks.push("半角标点");
  if (/（[）)]|[{[]/.test(text.replace(/（）/g, ""))) risks.push("括号残缺");
  if (/(诉讼法交通|含义.{0,6}含义|顺序第)/.test(text)) risks.push("焊接残词");
  return risks;
}

// ─────────────────────────── 骨架生成 ───────────────────────────

function ts(text) {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function skeletonNodes(kind, points) {
  const toNode = (text, index, parent) => {
    const label = text.replace(/^[0-9０-９]+[．.、]/, "").replace(/[。；]/g, "").slice(0, 12);
    const node = { label, detail: text };
    if (parent !== undefined) node.parent = parent;
    if (kind === "stairs" || kind === "timeline") node.step = `TODO-${index + 1}`;
    return node;
  };
  switch (kind) {
    case "tree":
      return [
        { label: "TODO-根节点", detail: points[0] ?? "TODO-根节点讲解", parent: -1 },
        ...points.slice(0, 6).map((text, i) => toNode(text, i, 0)),
      ];
    case "flow":
      return [
        ...points.slice(0, 7).map((text, i) => toNode(text, i)),
        { label: "TODO-终点", detail: "TODO-流程终点讲解", parent: 0 },
      ];
    case "stairs":
    case "timeline":
      return points.slice(0, 6).map((text, i) => toNode(text, i));
    case "balance":
      return [
        { label: "TODO-甲方", detail: points[0] ?? "TODO", parent: 0 },
        { label: "TODO-乙方", detail: points[1] ?? "TODO", parent: 0 },
      ];
    case "assemble":
      return [
        ...points.slice(0, 5).map((text, i) => toNode(text, i)),
        { label: "TODO-整体", detail: "TODO-装配整体讲解", parent: 0 },
      ];
    case "matrix":
      return points.slice(0, 6).map((text, i) => toNode(text, i));
    default:
      return points.slice(0, 6).map((text, i) => toNode(text, i));
  }
}

function balanceSkeleton(points) {
  return {
    left: "TODO-左侧概念",
    right: "TODO-右侧概念",
    diffs: points.slice(0, 5).map((text) => ["TODO-维度", text, "TODO-乙方"]),
  };
}

function buildSkeleton(lesson, kind) {
  const points = extractPoints(lesson);
  const entry = {
    lessonId: lesson.id,
    subject: lesson.subject,
    title: lesson.title.replace(/^(简述|论述|试述|分析)/, "").slice(0, 18) || lesson.title,
    kind,
    intro: "TODO-一句话说明这张图在讲什么",
    captions: points.slice(0, 8).map((text, i) => `${i + 1}. ${text}`),
    nodes: skeletonNodes(kind, points),
  };
  if (kind === "balance") entry.balance = balanceSkeleton(points);
  if (kind === "timeline") entry.eras = [{ label: "TODO-阶段", color: "#6f9277" }];
  return entry;
}

function renderEntryTs(entry) {
  const lines = [];
  lines.push(`  // S5-DRAFT：骨架待人工精炼（captions 提炼原文、nodes label/detail 校对、TODO 清零后删除本标记）`);
  lines.push(`  {`);
  lines.push(`    lessonId: ${ts(entry.lessonId)},`);
  lines.push(`    subject: ${ts(entry.subject)},`);
  lines.push(`    title: ${ts(entry.title)},`);
  lines.push(`    kind: ${ts(entry.kind)},`);
  lines.push(`    intro: ${ts(entry.intro)},`);
  lines.push(`    captions: [`);
  for (const caption of entry.captions) lines.push(`      ${ts(caption)},`);
  lines.push(`    ],`);
  lines.push(`    nodes: [`);
  for (const node of entry.nodes) {
    const parts = [`label: ${ts(node.label)}`, `detail: ${ts(node.detail)}`];
    if (node.parent !== undefined) parts.push(`parent: ${node.parent}`);
    if (node.step !== undefined) parts.push(`step: ${ts(node.step)}`);
    lines.push(`      { ${parts.join(", ")} },`);
  }
  lines.push(`    ],`);
  if (entry.balance) {
    lines.push(`    balance: {`);
    lines.push(`      left: ${ts(entry.balance.left)},`);
    lines.push(`      right: ${ts(entry.balance.right)},`);
    lines.push(`      diffs: [`);
    for (const diff of entry.balance.diffs) {
      lines.push(`        [${diff.map(ts).join(", ")}],`);
    }
    lines.push(`      ],`);
    lines.push(`    },`);
  }
  if (entry.eras) {
    lines.push(`    eras: [`);
    for (const era of entry.eras) lines.push(`      { label: ${ts(era.label)}, color: ${ts(era.color)} },`);
    lines.push(`    ],`);
  }
  lines.push(`  },`);
  return lines.join("\n");
}

function insertIntoTarget(rendered) {
  const source = readFileSync(TARGET_FILE, "utf8");
  const anchor = source.lastIndexOf("];");
  if (anchor === -1) throw new Error(`${TARGET_FILE} 中找不到数组结尾 ];`);
  const next = source.slice(0, anchor) + rendered + "\n" + source.slice(anchor);
  writeFileSync(TARGET_FILE, next, "utf8");
}

// ─────────────────────────── 配额报告 ───────────────────────────

function quotaReport(books) {
  const { ids, subjects } = existingGraphics();
  const dangling = ids.filter((id) => !allLessons(books).some((l) => l.id === id));
  console.log("── 图解配额（当前 → 目标） ──");
  for (const subject of SUBJECTS) {
    const current = subjects[subject] ?? 0;
    const target = QUOTA_TARGETS[subject];
    const gap = Math.max(0, target - current);
    console.log(
      `${SUBJECT_NAMES[subject]}  ${current} → ≥${target}  ${gap > 0 ? `还差 ${gap} 张 ⚠️` : "已达标 ✓"}`,
    );
  }
  const total = Object.values(subjects).reduce((a, b) => a + b, 0);
  console.log(`合计 ${total} 张（全局目标 ≥40）`);
  if (dangling.length) console.log(`⚠️ 悬空锚点：${dangling.join(", ")}`);
}

// ─────────────────────────── CLI ───────────────────────────

const args = process.argv.slice(2);
function argValue(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}
const has = (flag) => args.includes(flag);

const books = loadBooks();

if (has("--quota")) {
  quotaReport(books);
  process.exit(0);
}

const keyword = argValue("--find");
if (keyword) {
  const hits = findLessons(books, keyword);
  if (hits.length === 0) {
    console.log(`五本书里没找到含「${keyword}」的课时标题/导语。试试更短的关键词。`);
    process.exit(1);
  }
  for (const { lesson } of hits.slice(0, 15)) {
    const shell = isShellLesson(lesson);
    const taken = existingGraphics().ids.includes(lesson.id);
    console.log(
      `${lesson.id}  ${shell ? "[shell禁用]" : taken ? "[已有图解]" : "[可选]"}  ${lesson.title}  （steps:${lesson.steps.length} raw:${lesson.raw.length}）`,
    );
  }
  console.log(`\n共 ${hits.length} 条命中，展示前 ${Math.min(15, hits.length)} 条。用法：--anchor <id> --kind <图型>`);
  process.exit(0);
}

const anchor = argValue("--anchor");
if (anchor) {
  const lesson = allLessons(books).find((l) => l.id === anchor);
  if (!lesson) {
    console.error(`✗ 锚点 ${anchor} 不存在于五本 JSON——课时 id 可能已被 C 会话重建，用 --find 重新选题`);
    process.exit(1);
  }
  if (isShellLesson(lesson)) {
    console.error(`✗ 锚点 ${anchor} 是索引空壳课（shell），必须选有原文的实质课`);
    process.exit(1);
  }
  const kind = argValue("--kind");
  if (!kind || !KINDS.includes(kind)) {
    console.error(`✗ --kind 必填，可选：${KINDS.join(" / ")}`);
    process.exit(1);
  }
  const taken = existingGraphics().ids.includes(anchor);
  if (taken) console.error(`⚠️ ${anchor} 已有图解——确认要一课多图再继续`);

  const points = extractPoints(lesson);
  console.log(`\n✓ 锚点合法：${lesson.id}「${lesson.title}」（${SUBJECT_NAMES[lesson.subject]} · ${lesson.breadcrumb ?? ""} · ${lesson.pageRange ?? "?"}）`);
  console.log(`  提取到 ${points.length} 条原文要点，OCR 风险提示：`);
  for (const point of points.slice(0, 10)) {
    const risks = ocrRisk(point);
    if (risks.length) console.log(`    ⚠️ ${risks.join("/")}：${point.slice(0, 50)}…`);
  }
  console.log(`  数字/构成要件/条文人名存疑时必须渲染 E:\\法学考研知识库\\ 对应 PDF 页核对！\n`);

  const entry = buildSkeleton(lesson, kind);
  const rendered = renderEntryTs(entry);
  if (has("--insert")) {
    insertIntoTarget(rendered);
    console.log(`✓ 骨架已追加进 graphicsS5.ts（S5-DRAFT 标记，精炼后删除标记）`);
  } else {
    console.log(rendered);
    console.log(`\n（预览模式；加 --insert 直接追加进 graphicsExtended.ts）`);
  }
  quotaReport(books);
  process.exit(0);
}

console.log(`用法：
  node scripts/law-graphic-scaffold.mjs --find 关键词      选题检索
  node scripts/law-graphic-scaffold.mjs --quota            配额缺口
  node scripts/law-graphic-scaffold.mjs --anchor <id> --kind <${KINDS.join("|")}> [--insert]`);
process.exit(args.length ? 1 : 0);
