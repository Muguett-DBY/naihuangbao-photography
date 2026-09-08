// 誊录工作台：双栏表格交错残句（hanging/bracket）工单管理。
// 数据源：.tmp/law-scan-report.json（law:scan 产物）+ 五科 JSON（全文/页码）。
// 用法：
//   npm run law:debtlint                → 刷新工单（自动对账：已消失的 issue 标 fixed）
//   npm run law:debtlint -- --todo      → 只列待办
//   npm run law:debtlint -- --mark <lessonId/stepId> skip --reason "装订线不可辨"
//   npm run law:debtlint -- --mark <lessonId/stepId> inferred --reason "语义完整优先，依据：..."
// 工单持久文件 .tmp/law-debt-worklist.json（含人工标注，勿手删）；
// 剩余工作 = todo 归零（fixed+skipped+inferred 均算关闭，skipped/inferred 须带 reason）。
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const BOOK_IDS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"];
const BOOK_NAMES = { falixue: "法理学", xianfa: "宪法学", zhishixiang: "法制史", minfa: "民法", xingfa: "刑法" };
const SCAN_REPORT = join(root, ".tmp", "law-scan-report.json");
const WORKLIST = join(root, ".tmp", "law-debt-worklist.json");
const WORKLIST_MD = join(root, ".tmp", "law-debt-worklist.md");
const DEBT_CATEGORIES = new Set(["hanging-truncation", "bracket-imbalance"]);

const args = process.argv.slice(2);
const onlyTodo = args.includes("--todo");
const markIdx = args.indexOf("--mark");
const reasonIdx = args.indexOf("--reason");
const reason = reasonIdx >= 0 ? args.slice(reasonIdx + 1).join(" ") : "";

// ── 手动标注模式 ─────────────────────────────────────────────────────
if (markIdx >= 0) {
  const target = args[markIdx + 1] ?? "";
  const status = args[markIdx + 2] ?? "";
  if (!/^[a-z]+-q\d+(-tour)?\/s\d+$/.test(target) || !["skip", "inferred", "todo"].includes(status)) {
    console.error("用法: --mark <lessonId/stepId> <skip|inferred|todo> --reason \"...\"");
    process.exit(1);
  }
  if (status !== "todo" && !reason) {
    console.error("skip/inferred 必须给 --reason");
    process.exit(1);
  }
  const wl = JSON.parse(await readFile(WORKLIST, "utf8"));
  let hit = 0;
  for (const e of wl.entries) {
    if (!`${e.lessonId}/${e.stepId}`.startsWith(target)) continue;
    e.status = status === "skip" ? "skipped" : status;
    e.reason = reason;
    e.history.push(`${new Date().toISOString()} → ${e.status}${reason ? `（${reason}）` : ""}`);
    hit += 1;
  }
  if (!hit) {
    console.error(`工单里没有 ${target} 的条目`);
    process.exit(1);
  }
  await writeFile(WORKLIST, `${JSON.stringify(wl, null, 1)}\n`, "utf8");
  console.log(`已标 ${hit} 条 → ${status}`);
  process.exit(0);
}

// ── 刷新模式 ─────────────────────────────────────────────────────────
const report = JSON.parse(await readFile(SCAN_REPORT, "utf8"));
const debt = report.filter((it) => DEBT_CATEGORIES.has(it.category));

// 全文与页码：从五科 JSON 按 lessonId 建索引
const lessons = new Map();
for (const id of BOOK_IDS) {
  const { book } = JSON.parse(await readFile(join(root, "src", "data", "law", `${id}.json`), "utf8"));
  for (const ch of book.chapters) for (const ls of ch.lessons) lessons.set(ls.id, ls);
}

const key = (it) => `${it.lessonId}/${it.stepId}|${it.category}|${it.note}`;
const prev = JSON.parse(await readFile(WORKLIST, "utf8").catch(() => '{"entries":[]}'));
const prevByKey = new Map(prev.entries.map((e) => [e.key, e]));

const now = new Date().toISOString();
const entries = [];
for (const it of debt) {
  const lesson = lessons.get(it.lessonId);
  const step = lesson?.steps.find((s) => s.id === it.stepId);
  const k = key(it);
  const old = prevByKey.get(k);
  const e = {
    key: k,
    subject: it.subject,
    lessonId: it.lessonId,
    lessonTitle: lesson?.title ?? "?",
    stepId: it.stepId,
    category: it.category,
    note: it.note,
    pages: lesson?.pageRange ?? [0, 0],
    text: step?.text ?? `（步骤缺失）${it.evidence}`,
    ...(step?.parts ? { parts: step.parts } : {}),
    status: "todo",
    reason: "",
    history: [],
  };
  if (old) {
    // 已知条目：保留人工标注（skip/inferred 不因刷新丢失）
    e.status = old.status;
    e.reason = old.reason;
    e.history = [...old.history];
  } else {
    e.history.push(`${now} → 新增 todo`);
  }
  entries.push(e);
  prevByKey.delete(k);
}
// 上轮存在、本轮扫描已不复现的：todo → 自动 fixed（真修好/管线消化）；
// skipped/inferred 若 issue 消失也升 fixed（被管线或他人修复）；fixed 保留记录
for (const e of prevByKey.values()) {
  if (e.status === "todo") {
    e.status = "fixed";
    e.history.push(`${now} → fixed（扫描已复现不到）`);
  } else if (e.status !== "fixed") {
    e.history.push(`${now} → ${e.status} 的 issue 已消失（升 fixed）`);
    e.status = "fixed";
  }
  entries.push(e);
}

const by = (s) => entries.filter((e) => e.status === s).length;
const wl = { generatedAt: now, scanDebtTotal: debt.length, entries };
await mkdir(join(root, ".tmp"), { recursive: true });
await writeFile(WORKLIST, `${JSON.stringify(wl, null, 1)}\n`, "utf8");

// 人类可读清单（按科分组，todo 在前）
const order = { todo: 0, inferred: 1, skipped: 2, fixed: 3 };
entries.sort(
  (a, b) =>
    BOOK_IDS.indexOf(a.subject) - BOOK_IDS.indexOf(b.subject) ||
    order[a.status] - order[b.status] ||
    a.lessonId.localeCompare(b.lessonId),
);
const md = [
  `# 交错残句工单（${new Date().toLocaleString("zh-CN")}）`,
  "",
  `总计 ${entries.length}：todo ${by("todo")} / fixed ${by("fixed")} / inferred ${by("inferred")} / skipped ${by("skipped")}`,
  "",
];
for (const subj of BOOK_IDS) {
  const es = entries.filter((e) => e.subject === subj);
  if (!es.length) continue;
  md.push(`## ${BOOK_NAMES[subj]}（${es.length}）`);
  for (const e of es) {
    md.push(
      `- [${e.status}] \`${e.lessonId}/${e.stepId}\` p${e.pages[0]}-${e.pages[1]} 「${e.lessonTitle}」${e.note}${e.reason ? `｜${e.reason}` : ""}`,
    );
  }
  md.push("");
}
await writeFile(WORKLIST_MD, md.join("\n"), "utf8");

console.log(
  `工单：总计 ${entries.length}｜todo ${by("todo")}｜fixed ${by("fixed")}｜inferred ${by("inferred")}｜skipped ${by("skipped")}`,
);
if (onlyTodo) {
  for (const e of entries.filter((x) => x.status === "todo")) {
    console.log(`[todo] ${e.lessonId}/${e.stepId} p${e.pages[0]}-${e.pages[1]} ${e.note} 「${e.lessonTitle}」`);
  }
}
console.log(`明细 → ${WORKLIST_MD}`);
