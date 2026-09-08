// 法学内容残留问题全量扫描：五科 JSON 的步骤/标题按六类分类报告。
// 运行：node scripts/scan-law-content.mjs [--verbose] [--update-baseline]
// 输出：控制台分类统计 + .tmp/law-scan-report.json（逐条定位，供修复追踪）
// 定位：只报告"管线已放行"的残留（管线内已有的清洗规则视为已生效基线）。
// CI 门禁（S3·T4）：总量超过 scripts/law-scan-baseline.json 即 exit 1（防内容回潮）；
// 存量 159 条是历史欠账（S2 分批清理中），只允许降不允许升。
//   --update-baseline  内容清理后把新总量写进基线（只降不升，棘轮下行）
//   LAW_SCAN_STRICT=1  本地严格模式：任何残留都 exit 1
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const BOOK_IDS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"];
const verbose = process.argv.includes("--verbose");
const updateBaseline = process.argv.includes("--update-baseline");
const strict = process.env.LAW_SCAN_STRICT === "1";
const BASELINE_FILE = join(root, "scripts", "law-scan-baseline.json");

const issues = [];
const push = (category, subject, lessonId, stepId, evidence, note = "") =>
  issues.push({ category, subject, lessonId, stepId, evidence: evidence.slice(0, 120), note });

// ── 检测器 ────────────────────────────────────────────────────────────

/** 1) 括号不配对：步骤内 （）/［］/《》/「」 计数失衡 */
function scanBrackets(subject, lesson, step) {
  for (const [open, close, name] of [["（", "）", "paren"], ["［", "］", "square"], ["《", "》", "book"], ["「", "」", "corner"]]) {
    const o = [...step.text].filter((ch) => ch === open).length;
    const c = [...step.text].filter((ch) => ch === close).length;
    if (o !== c) push("bracket-imbalance", subject, lesson.id, step.id, step.text, `${name} ${o}开${c}闭`);
  }
}

/** 2) 糊字变体：页眉页脚糊串、糊版章名、OCR 占位符等残留在正文。
 *  必须命中完整糊链条——"法建/法相士"单字串会误伤"立法建设/合法建造"等合法词 */
const GARBLE_PATTERNS = [
  [/考试?背[偏诵楠痛]{1,2}[一壹][本木]/, "页眉糊串(考试背一本)"],
  [/[法策][相建猫钟橘铺][士土弯]/, "页眉糊字变体(三字糊核)"],
  [/昔楠|弯试|背一朱|一未·|一木庙/, "页眉糊字变体(精确串)"],
  [/第[大小宽二王三四五六七八九十]{1,3}[童意亿审][〇○0]/, "糊版章名"],
  [/〇(?![〇0-9年])/, "〇占位符(非年份)"],
  [/[□◊]/, "方框占位符"],
  [/(?<![八四])○(?![〇0-9年])/, "○残迹(非年份/非引文1840)"],
];
function scanGarble(subject, lesson, step) {
  for (const [re, name] of GARBLE_PATTERNS) {
    const m = re.exec(step.text);
    if (m) push("garble-variant", subject, lesson.id, step.id, step.text, `${name}：“${m[0]}”`);
  }
}

/** 3) 焊接残句：真正的结构损伤。
 *  行内"（一）（1）"编号是教材原生结构（表格行序号），不视为焊接——
 *  只报告句读粘连与半截编号（"（-）"这类空编号）*/
function scanWelded(subject, lesson, step) {
  for (const pair of ["。。", "，，", "；；", "：：", "！！", "？？", "、。", "。，", "，。"]) {
    if (step.text.includes(pair)) {
      push("welded-fragment", subject, lesson.id, step.id, step.text, `句读粘连“${pair}”`);
      break;
    }
  }
  if (/[（(][-—–]?[)）]/.test(step.text) && !/[（(][一二三四五六七八九十1-9]/.test(step.text))
    push("welded-fragment", subject, lesson.id, step.id, step.text, "空编号残段");
}

/** 4) 悬停截断：步骤以纯虚词收尾（真截断）。
 *  单字为/于/向/据/由/变/受/联 等可结尾于合法名词（行为/自由/依据/改变），
 *  只收"绝不可能作名词尾字"的纯功能词 + 常见功能词双字尾 */
const HANG_BAD_SINGLE = /[的与或及是对把被从而且但其至了着跟]$/;
const HANG_NOUN_OK = /(目的|标的|别的|有的|显得|懂得|记得|觉得|贵的)$/;
const HANG_BAD_DOUBLE = /(以及|从而|进而|因而|鉴于|基于|使得|对于|属于|成为|作为|所谓|如果|虽然|但是|因为|所以|为了|不是|需要|应当|必须|可以|能够|可能|已经|正在|开始|继续|进行|产生|形成|具有|包括|意味)$/;
function scanHanging(subject, lesson, step) {
  const t = step.text.replace(/[；;，,]$/, "");
  if (t.length < 6 || /[。！？…”」》）]$/.test(step.text)) return;
  if (HANG_NOUN_OK.test(t)) return;
  if (HANG_BAD_SINGLE.test(t)) push("hanging-truncation", subject, lesson.id, step.id, step.text, "连接词悬停收尾");
  else if (HANG_BAD_DOUBLE.test(t)) push("hanging-truncation", subject, lesson.id, step.id, step.text, "功能词悬停收尾");
}

/** 5) 回声叠字：相邻重复汉字串。导览课（-tour）的思维导图行标签天然存在
 *  "父行+子行"重复（"代理权｜代理权的行使"），且分块拼接不经过折叠，属结构形态非噪音 */
function scanEcho(subject, lesson, step) {
  if (lesson.id.endsWith("-tour")) return;
  const ECHO_OK = /^(大大|小小|高高|低低|久久|渐渐|往往|常常|刚刚|明明|时时|层层|一一|人人|种种|点点|个个|步步|处处|代代|日日夜夜|口口声声|形形色色|世世代代)/;
  const re = /([\u4e00-\u9fa5]{2,10})\1/;
  const m = re.exec(step.text);
  if (m && !ECHO_OK.test(m[1])) push("echo-dup", subject, lesson.id, step.id, step.text, `叠串“${m[0]}”`);
}

/** 6) 双标点/标点残迹（扫描粒度到 parts——text 已被管线压缩） */
function scanPunct(subject, lesson, step) {
  if (/[，；：、]{2,}/.test(step.text)) push("double-punct", subject, lesson.id, step.id, step.text, "连续句读");
  if (/[a-zA-Z]{3,}[一-龥]/.test(step.text)) {
    const m = /[a-zA-Z]{3,}[一-龥]/.exec(step.text);
    if (!/Whig|Tory|Sino|China/.test(m[0])) push("double-punct", subject, lesson.id, step.id, step.text, `拉丁残渣“${m[0]}”`);
  }
}

/** 标题级检查：乱码/糊字标题（含 shell 课） */
function scanTitle(subject, lesson) {
  const t = lesson.title;
  if (/[〇○□◊]/.test(t)) push("title-garble", subject, lesson.id, "-", t, "占位符标题");
  if (/[a-zA-Z]{3,}/.test(t) && !/Whig|Tory/.test(t)) push("title-garble", subject, lesson.id, "-", t, "拉丁残渣标题");
  if (/^[^一-龥A-Za-z0-9《“「（〔［]+/.test(t) && t.length > 0) {
    // 首字符为标点/符号的标题
    push("title-garble", subject, lesson.id, "-", t, "首字符异常");
  }
}

// ── 主流程 ────────────────────────────────────────────────────────────
const books = {};
for (const id of BOOK_IDS) {
  books[id] = JSON.parse(await readFile(join(root, "src", "data", "law", `${id}.json`), "utf8")).book;
}

for (const [id, book] of Object.entries(books)) {
  for (const chapter of book.chapters) {
    if (/^[〇○□◊]/.test(chapter.title ?? "")) push("title-garble", id, chapter.id, "-", chapter.title, "章标题占位符");
    for (const lesson of chapter.lessons) {
      scanTitle(id, lesson);
      for (const step of lesson.steps) {
        scanBrackets(id, lesson, step);
        scanGarble(id, lesson, step);
        scanWelded(id, lesson, step);
        scanHanging(id, lesson, step);
        scanEcho(id, lesson, step);
        scanPunct(id, lesson, step);
      }
    }
  }
}

// 汇总
const byCat = new Map();
for (const it of issues) {
  const key = `${it.category}`;
  if (!byCat.has(key)) byCat.set(key, new Map());
  const subj = byCat.get(key);
  subj.set(it.subject, (subj.get(it.subject) ?? 0) + 1);
}

console.log(`\n=== 法学内容残留扫描（${issues.length} 条）===`);
for (const [cat, subjects] of [...byCat.entries()].sort((a, b) => b[1].size - a[1].size)) {
  const total = [...subjects.values()].reduce((a, b) => a + b, 0);
  console.log(`${cat}: ${total}  { ${[...subjects.entries()].map(([s, n]) => `${s}:${n}`).join(" ")} }`);
}

await mkdir(join(root, ".tmp"), { recursive: true });
await writeFile(join(root, ".tmp", "law-scan-report.json"), JSON.stringify(issues, null, 1), "utf8");
console.log("\n明细 → .tmp/law-scan-report.json");

if (verbose) {
  for (const it of issues) {
    console.log(`[${it.category}] ${it.lessonId}/${it.stepId} ${it.note}\n    ${it.evidence}`);
  }
}

// ── CI 门禁：基线棘轮（S3·T4 裁决落地）─────────────────────────────────
// 现状是 159 条历史欠账，"任何残留即红"会立刻堵死全部并行流水线；
// 采用棘轮：超基线 = 内容回潮 = 红；降基线需显式 --update-baseline 落盘。
let baselineTotal = null;
try {
  baselineTotal = JSON.parse(await readFile(BASELINE_FILE, "utf8")).total ?? null;
} catch {
  baselineTotal = null; // 无基线文件：视为无欠账上限（首跑会红，跑 --update-baseline 建基线）
}

if (updateBaseline) {
  if (baselineTotal !== null && issues.length > baselineTotal) {
    console.error(`\n✗ 拒绝上调基线（${baselineTotal} → ${issues.length}）：先清理新增残留再更新`);
    process.exit(1);
  }
  await writeFile(BASELINE_FILE, `${JSON.stringify({ total: issues.length, updatedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
  console.log(`\n✓ 基线已更新：${baselineTotal ?? "—"} → ${issues.length}`);
  process.exit(0);
}

if (strict && issues.length > 0) {
  console.error(`\n✗ LAW_SCAN_STRICT：仍有 ${issues.length} 条残留`);
  process.exit(1);
}

if (baselineTotal === null) {
  console.error("\n✗ 缺少 scripts/law-scan-baseline.json：先运行 npm run law:scan -- --update-baseline 建立基线");
  process.exit(1);
}
if (issues.length > baselineTotal) {
  console.error(`\n✗ 内容回潮：${issues.length} 条 > 基线 ${baselineTotal} 条（明细见 .tmp/law-scan-report.json）`);
  console.error("  修复新增残留，或（若为误报收窄）显式重定基线：npm run law:scan -- --update-baseline");
  process.exit(1);
}
if (issues.length < baselineTotal) {
  console.log(`\n✓ 残留下降：${issues.length} < 基线 ${baselineTotal}。清理完成后请落盘新基线：`);
  console.log("  npm run law:scan -- --update-baseline");
}
process.exit(0);
