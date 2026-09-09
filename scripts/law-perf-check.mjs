// 法学模块性能巡逻：五科逐一实测（独立 preview 实例，不占用共享端口）
//   ① 学科页首屏可交互时间（hero 可见）
//   ② 直开一节课的可交互时间（.law-player 可见）
//   ③ 进一节课的数据传输量（/assets/*.json：raw + gzip；预算 ≤300KB / ≤80KB）
//   ④ 整本装配的 JSON 解析内存增量（subject 页 heap delta）
//   ⑤ 课时打开耗时 P50/P95（五科各 5 课，S6·T4 入基线，超基线×容差非零退出）
// 输出 .tmp/law-perf-report.md，预算超限退出码非零 —— 任何回归一键复测：
//   npm run law:perf          （对照 scripts/law-perf-baseline.json 检查）
//   npm run law:perf -- --update-baseline（重录基线，本机口径）
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { gzipSync } from "node:zlib";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const CHUNKS_DIR = join(root, "src", "data", "law", "chunks");
const BASELINE_FILE = join(root, "scripts", "law-perf-baseline.json");
const SUBJECTS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"];
const DATA_RAW_BUDGET = 300 * 1024;
const DATA_GZ_BUDGET = 80 * 1024;
/** 基线容差：本机计时噪声大，超基线 25% 才算回归 */
const BASELINE_TOLERANCE = 1.25;
const UPDATE_BASELINE = process.argv.includes("--update-baseline");

const KB = (bytes) => `${(bytes / 1024).toFixed(0)}KB`;

async function freePort(start) {
  for (let port = start; port < start + 10; port += 1) {
    const free = await new Promise((resolveFree) => {
      const server = createServer();
      server.once("error", () => resolveFree(false));
      server.once("listening", () => server.close(() => resolveFree(true)));
      server.listen(port, "127.0.0.1");
    });
    if (free) return port;
  }
  throw new Error(`no free port from ${start}`);
}

async function startPreview(port) {
  // 不经 shell 直接 node 调 vite bin：Windows 上 child.kill() 才能真正杀掉服务进程
  const child = spawn(process.execPath, [
    join(root, "node_modules", "vite", "bin", "vite.js"),
    "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort",
  ], { cwd: root, stdio: "ignore" });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i += 1) {
    await new Promise((wait) => setTimeout(wait, 500));
    try {
      const response = await fetch(`${base}/release.json`);
      if (response.ok) return { child, base };
    } catch {
      // not ready yet
    }
  }
  child.kill();
  throw new Error("preview server did not start");
}

/** 磁盘上分块文件的 raw/gzip 字节数（与线上 CF 压缩口径对齐） */
async function chunkSizesOnDisk() {
  const sizes = new Map(); // asset basename → { raw, gz }
  for (const subject of SUBJECTS) {
    const dir = join(CHUNKS_DIR, subject);
    for (const file of await readdir(dir)) {
      if (!file.endsWith(".json")) continue;
      const bytes = await readFile(join(dir, file));
      // vite 发成 {name}-{hash}.json，按 name 段匹配
      const stem = file.replace(/\.json$/, "");
      sizes.set(stem, { raw: bytes.length, gz: gzipSync(bytes).length });
    }
  }
  return sizes;
}

function matchDiskChunk(sizes, url) {
  const base = url.split("/").at(-1)?.replace(/\.json.*$/, "") ?? "";
  if (!base) return null;
  for (const [stem, size] of sizes) {
    if (base === stem || base.startsWith(`${stem}-`)) return size;
  }
  return null;
}

async function measurePage(base, url, waitSelector, sizes) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const started = Date.now();
  const dataChunks = []; // { url, raw, gz }
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith("/assets/") && url.pathname.endsWith(".json")) {
      const size = matchDiskChunk(sizes, url.pathname);
      dataChunks.push({ url: url.pathname, raw: size?.raw ?? 0, gz: size?.gz ?? 0 });
    }
  });

  await page.goto(`${base}${url}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(waitSelector, { timeout: 60_000 });
  const interactiveMs = Date.now() - started;

  const heapMb = await page.evaluate(() => {
    const memory = performance.memory;
    return memory ? memory.usedJSHeapSize / (1024 * 1024) : null;
  });

  // 只保留本页实际加载的分块去重后求和
  const seen = new Set();
  let raw = 0;
  let gz = 0;
  for (const chunk of dataChunks) {
    if (seen.has(chunk.url)) continue;
    seen.add(chunk.url);
    raw += chunk.raw;
    gz += chunk.gz;
  }

  await browser.close();
  return { interactiveMs, dataRaw: raw, dataGz: gz, heapMb };
}

async function main() {
  const statDist = await stat(join(root, "dist", "index.html")).catch(() => null);
  if (!statDist) {
    console.error("dist/ 不存在：先 npm run build 再跑性能巡逻");
    process.exit(2);
  }

  // 每科取第一节"学习流课时"（跳过导览/索引壳课，与 app 口径一致）
  // 另取"最坏课时"：所在分块文件最大的那课（单课巨型课如 xingfa 第十二部分 185KB）
  const firstFlowLesson = new Map();
  const worstLesson = new Map();
  const worstLayered = new Map();
  const sampleLessons = new Map(); // S6·T4：每科 5 门采样课（P50/P95 用）
  for (const subject of SUBJECTS) {
    const dir = join(CHUNKS_DIR, subject);
    const meta = JSON.parse(await readFile(join(dir, `${subject}-meta.json`), "utf8"));
    // v2 紧凑 meta：ls 为 [短课id, 标题, f, lt?] 元组，id 去 `subject-` 前缀
    const flowTuples = meta.chapters.flatMap((chapter) => chapter.ls).filter((tuple) => tuple[2] === 1);
    const flowIds = flowTuples.map((tuple) => `${subject}-${tuple[0]}`);
    if (flowIds.length === 0) throw new Error(`${subject} 没有学习流课时？`);
    firstFlowLesson.set(subject, flowIds[0]);
    // 五科各 5 门采样课：均匀铺满全书（首/25%/50%/75%/尾），覆盖长短课分布
    const picks = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
      flowIds[Math.min(flowIds.length - 1, Math.round(ratio * (flowIds.length - 1)))],
    );
    sampleLessons.set(subject, [...new Set(picks)]);

    let biggest = { file: "", bytes: -1 };
    for (const file of await readdir(dir)) {
      // light/tail 是课内分层伴生文件（S6·T1），不是正文 part，不参与"最坏分块"评选
      if (!file.endsWith(".json") || file.includes("-meta") || file.includes("-light") || file.includes("-tail")) continue;
      const bytes = (await stat(join(dir, file))).size;
      if (bytes > biggest.bytes) biggest = { file, bytes };
    }
    const worstPart = JSON.parse(await readFile(join(dir, biggest.file), "utf8"));
    const worstId = worstPart.segments[0]?.lessons[0]?.id ?? "";
    worstLesson.set(subject, worstId);
    // 分层课：首屏只拉轻视图（meta 元组第 4 位 lt 标记），尾部全文懒加载 —— 报告里注明口径
    const worstTuple = flowTuples.find((tuple) => `${subject}-${tuple[0]}` === worstId);
    worstLayered.set(subject, Boolean(worstTuple?.[3]));
  }

  const sizes = await chunkSizesOnDisk();
  const port = await freePort(4194);
  const { child, base } = await startPreview(port);
  const rows = [];
  let violations = 0;
  const openSamples = []; // S6·T4：课时打开耗时采样

  try {
    for (const subject of SUBJECTS) {
      const lessonId = firstFlowLesson.get(subject);
      const subjectPage = await measurePage(base, `/law/${subject}`, ".law-subject__hero h1", sizes);
      const lessonPage = await measurePage(base, `/law/learn/${lessonId}`, ".law-player", sizes);
      const worstId = worstLesson.get(subject);
      const worstPage = worstId === lessonId ? null : await measurePage(base, `/law/learn/${worstId}`, ".law-player", sizes);
      const check = worstPage ?? lessonPage;
      const ok = check.dataRaw <= DATA_RAW_BUDGET && check.dataGz <= DATA_GZ_BUDGET;
      if (!ok) violations += 1;
      const layeredNote = worstLayered.get(subject) ? "·分层轻视图" : "";
      const worstCell = worstPage
        ? `${KB(worstPage.dataRaw)}/${KB(worstPage.dataGz)}gz${layeredNote}`
        : "同首课";
      rows.push(
        `| ${subject} | ${subjectPage.interactiveMs}ms | ${lessonPage.interactiveMs}ms | ${KB(lessonPage.dataRaw)} | ${KB(lessonPage.dataGz)} | ${worstCell} | ${lessonPage.heapMb?.toFixed(1) ?? "n/a"}MB | ${subjectPage.heapMb?.toFixed(1) ?? "n/a"}MB | ${ok ? "✅" : "❌ 超预算"} |`,
      );
      console.log(`${subject}: hero ${subjectPage.interactiveMs}ms | lesson ${lessonPage.interactiveMs}ms | data ${KB(lessonPage.dataRaw)}/${KB(lessonPage.dataGz)}gz | worst ${worstCell} | heap ${lessonPage.heapMb?.toFixed(1)}MB`);
    }

    // ── S6·T4：课时打开耗时 P50/P95（五科各 5 门采样课，独立页面逐测）──
    for (const subject of SUBJECTS) {
      for (const lessonId of sampleLessons.get(subject)) {
        const page = await measurePage(base, `/law/learn/${lessonId}`, ".law-player", sizes);
        openSamples.push({ subject, lessonId, ms: page.interactiveMs });
      }
      console.log(`${subject}: 采样 ${sampleLessons.get(subject).length} 课计时完成`);
    }
  } finally {
    child.kill();
  }

  const times = openSamples.map((sample) => sample.ms).sort((a, b) => a - b);
  const p50 = percentile(times, 0.5);
  const p95 = percentile(times, 0.95);

  // ── 基线对照（scripts/law-perf-baseline.json；缺失则落盘建立，--update-baseline 重录）──
  let baselineRegression = false;
  let baseline = null;
  try {
    baseline = JSON.parse(await readFile(BASELINE_FILE, "utf8"));
  } catch {
    baseline = null;
  }
  if (!baseline?.perf || UPDATE_BASELINE) {
    const next = { ...(baseline ?? {}), perf: { updatedAt: new Date().toISOString(), p50Ms: p50, p95Ms: p95, samples: times.length } };
    await writeFile(BASELINE_FILE, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    console.log(`📎 基线已${baseline?.perf ? "更新" : "建立"}：课时打开 P50 ${p50}ms / P95 ${p95}ms → scripts/law-perf-baseline.json`);
  } else {
    const limit50 = Math.ceil(baseline.perf.p50Ms * BASELINE_TOLERANCE);
    const limit95 = Math.ceil(baseline.perf.p95Ms * BASELINE_TOLERANCE);
    const over50 = p50 > limit50;
    const over95 = p95 > limit95;
    baselineRegression = over50 || over95;
    console.log(`基线对照：P50 ${p50}ms / 基线 ${baseline.perf.p50Ms}ms（上限 ${limit50}）${over50 ? " ❌" : " ✅"}；P95 ${p95}ms / 基线 ${baseline.perf.p95Ms}ms（上限 ${limit95}）${over95 ? " ❌" : " ✅"}`);
  }

  const slowest = [...openSamples].sort((a, b) => b.ms - a.ms).slice(0, 5);
  const report = [
    "# law 性能巡逻报告",
    "",
    `- 时间：${new Date().toISOString()}`,
    `- 实例：vite preview :${port}（独立端口，不占共享 4174）`,
    `- 预算：进一节课 law 数据 ≤ ${KB(DATA_RAW_BUDGET)} raw / ≤ ${KB(DATA_GZ_BUDGET)} gzip`,
    "",
    "| 科目 | 学科页首屏 | 直开一课 | 课时数据 raw | 课时数据 gzip | 最坏课时 raw/gz | 课时 heap | 整本 heap | 预算 |",
    "|---|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
    "## 课时打开耗时（S6·T4，五科各 5 课采样）",
    "",
    `- P50 **${p50}ms** / P95 **${p95}ms**（n=${times.length}，容差 ×${BASELINE_TOLERANCE} 对照 scripts/law-perf-baseline.json）`,
    `- 最慢 5 课：${slowest.map((sample) => `${sample.lessonId} ${sample.ms}ms`).join("、")}`,
    "",
  ].join("\n");
  await writeFile(join(root, ".tmp", "law-perf-report.md"), report, "utf8");
  console.log(report);
  if (violations > 0) {
    console.error(`❌ ${violations} 科超预算，详见 .tmp/law-perf-report.md`);
    process.exit(1);
  }
  if (baselineRegression) {
    console.error("❌ 课时打开耗时超基线（容差内视为正常），详见 .tmp/law-perf-report.md");
    process.exit(1);
  }
  console.log("✅ 全部科目在预算内，计时在基线内");
}

/** 最近邻位百分位（升序数组） */
function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
}

await main();
