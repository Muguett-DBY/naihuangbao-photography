// 法学模块性能巡逻：五科逐一实测（独立 preview 实例，不占用共享端口）
//   ① 学科页首屏可交互时间（hero 可见）
//   ② 直开一节课的可交互时间（.law-player 可见）
//   ③ 进一节课的数据传输量（/assets/*.json：raw + gzip；预算 ≤300KB / ≤80KB）
//   ④ 整本装配的 JSON 解析内存增量（subject 页 heap delta）
// 输出 .tmp/law-perf-report.md，预算超限退出码非零 —— 任何回归一键复测：
//   npm run law:perf
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { gzipSync } from "node:zlib";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const CHUNKS_DIR = join(root, "src", "data", "law", "chunks");
const SUBJECTS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"];
const DATA_RAW_BUDGET = 300 * 1024;
const DATA_GZ_BUDGET = 80 * 1024;

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
  const firstFlowLesson = new Map();
  for (const subject of SUBJECTS) {
    const meta = JSON.parse(await readFile(join(CHUNKS_DIR, subject, `${subject}-meta.json`), "utf8"));
    const hit = meta.chapters.flatMap((chapter) => chapter.ls).find((lesson) => lesson.f === 1);
    if (!hit) throw new Error(`${subject} 没有学习流课时？`);
    firstFlowLesson.set(subject, hit.i);
  }

  const sizes = await chunkSizesOnDisk();
  const port = await freePort(4194);
  const { child, base } = await startPreview(port);
  const rows = [];
  let violations = 0;

  try {
    for (const subject of SUBJECTS) {
      const lessonId = firstFlowLesson.get(subject);
      const subjectPage = await measurePage(base, `/law/${subject}`, ".law-subject__hero h1", sizes);
      const lessonPage = await measurePage(base, `/law/learn/${lessonId}`, ".law-player", sizes);
      const ok = lessonPage.dataRaw <= DATA_RAW_BUDGET && lessonPage.dataGz <= DATA_GZ_BUDGET;
      if (!ok) violations += 1;
      rows.push(
        `| ${subject} | ${subjectPage.interactiveMs}ms | ${lessonPage.interactiveMs}ms | ${KB(lessonPage.dataRaw)} | ${KB(lessonPage.dataGz)} | ${lessonPage.heapMb?.toFixed(1) ?? "n/a"}MB | ${subjectPage.heapMb?.toFixed(1) ?? "n/a"}MB | ${ok ? "✅" : "❌ 超预算"} |`,
      );
      console.log(`${subject}: hero ${subjectPage.interactiveMs}ms | lesson ${lessonPage.interactiveMs}ms | data ${KB(lessonPage.dataRaw)}/${KB(lessonPage.dataGz)}gz | heap ${lessonPage.heapMb?.toFixed(1)}MB`);
    }
  } finally {
    child.kill();
  }

  const report = [
    "# law 性能巡逻报告",
    "",
    `- 时间：${new Date().toISOString()}`,
    `- 实例：vite preview :${port}（独立端口，不占共享 4174）`,
    `- 预算：进一节课 law 数据 ≤ ${KB(DATA_RAW_BUDGET)} raw / ≤ ${KB(DATA_GZ_BUDGET)} gzip`,
    "",
    "| 科目 | 学科页首屏 | 直开一课 | 课时数据 raw | 课时数据 gzip | 课时 heap | 整本 heap | 预算 |",
    "|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
  await writeFile(join(root, ".tmp", "law-perf-report.md"), report, "utf8");
  console.log(report);
  if (violations > 0) {
    console.error(`❌ ${violations} 科超预算，详见 .tmp/law-perf-report.md`);
    process.exit(1);
  }
  console.log("✅ 全部科目在预算内");
}

await main();
