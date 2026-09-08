// 法学模块容量终审报告（S6·T5）：五科 chunk 体积 / 最大课时 / JSON 解析内存
// 三项当前值 vs 基线对比 + lighthouse 式自建抽查（首屏可交互、SW 缓存命中）。
// 基线来源（代码内常量，注明出处）：
//   - D 会话基线：2026-09-07 夜（worklog-D 收尾快照 + .tmp/law-perf-report.md @f988f78）
//   - S6 改前基线：2026-09-09 凌晨 T1 动工前实测（npm run law:perf @0ef4fbc^）
// 运行：node scripts/law-capacity-report.mjs（需先 npm run build）
// 输出：.tmp/law-capacity-report.md
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { gzipSync } from "node:zlib";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const CHUNKS_DIR = join(root, "src", "data", "law", "chunks");
const SUBJECTS = ["falixue", "xianfa", "zhishixiang", "minfa", "xingfa"];
const KB = (bytes) => `${(bytes / 1024).toFixed(0)}KB`;

// ── D 会话基线（2026-09-07 夜，分块架构上线时）──
const D_BASELINE = {
  worstLessonRaw: { falixue: 129 * 1024, xianfa: 131 * 1024, zhishixiang: 158 * 1024, minfa: 174 * 1024, xingfa: 253 * 1024 },
  bookHeapMb: { falixue: 12.1, xianfa: 10.7, zhishixiang: 12.8, minfa: 15.4, xingfa: 13.6 },
};
// ── S6 改前基线（2026-09-09 凌晨，T1 动工前同机实测）──
const S6_BEFORE = {
  worstLessonRaw: { falixue: 129 * 1024, xianfa: 131 * 1024, zhishixiang: 159 * 1024, minfa: 174 * 1024, xingfa: 245 * 1024 },
};

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
  const child = spawn(process.execPath, [
    join(root, "node_modules", "vite", "bin", "vite.js"),
    "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort",
  ], { cwd: root, stdio: "ignore" });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i += 1) {
    await new Promise((wait) => setTimeout(wait, 500));
    try { if ((await fetch(`${base}/release.json`)).ok) return { child, base }; } catch { /* not ready */ }
  }
  child.kill();
  throw new Error("preview did not start");
}

/** 磁盘 chunk 清点：meta/parts/light/tail 分类 + gzip */
async function chunkInventory() {
  const inventory = {};
  for (const subject of SUBJECTS) {
    const dir = join(CHUNKS_DIR, subject);
    const inv = { meta: 0, parts: 0, light: 0, tail: 0, metaGz: 0, partsGz: 0, lightGz: 0, tailGz: 0, counts: { meta: 0, parts: 0, light: 0, tail: 0 } };
    for (const file of await readdir(dir)) {
      if (!file.endsWith(".json")) continue;
      const bytes = (await readFile(join(dir, file))).length;
      const gz = gzipSync(Buffer.from(await readFile(join(dir, file)))).length;
      const kind = file.includes("-meta") ? "meta" : file.includes("-light") ? "light" : file.includes("-tail") ? "tail" : "parts";
      inv[kind] += bytes;
      inv[`${kind}Gz`] += gz;
      inv.counts[kind] += 1;
    }
    inventory[subject] = inv;
  }
  return inventory;
}

/** 最大课时（解析 parts 逐课字节；分层课标注 light/tail 拆分并记录其 light 文件大小） */
async function maxLessonPerSubject() {
  const result = {};
  for (const subject of SUBJECTS) {
    const dir = join(CHUNKS_DIR, subject);
    let max = { id: "", bytes: 0 };
    const layered = [];
    for (const file of await readdir(dir)) {
      if (!file.endsWith(".json") || file.includes("-meta")) continue;
      if (file.includes("-light") || file.includes("-tail")) {
        layered.push(file);
        continue;
      }
      const part = JSON.parse(await readFile(join(dir, file), "utf8"));
      for (const segment of part.segments) {
        for (const lesson of segment.lessons) {
          const bytes = Buffer.byteLength(JSON.stringify(lesson));
          if (bytes > max.bytes) max = { id: lesson.id, bytes };
        }
      }
    }
    // 该课若是分层课，取它自己的 light 文件大小（首屏真实拉取量），而非全科 light 之和
    let lightBytes = 0;
    try {
      lightBytes = (await readFile(join(dir, `${max.id}-light.json`))).length;
    } catch {
      lightBytes = 0; // 非分层课
    }
    result[subject] = { ...max, companionFiles: layered.length, lightBytes };
  }
  return result;
}

async function main() {
  if (!(await stat(join(root, "dist", "index.html")).catch(() => null))) {
    console.error("dist/ 不存在：先 npm run build");
    process.exit(2);
  }
  const inventory = await chunkInventory();
  const maxLessons = await maxLessonPerSubject();

  const port = await freePort(4244);
  const { child, base } = await startPreview(port);
  const browser = await chromium.launch();
  const spot = {};

  try {
    // ── 整本装配 heap + 首屏可交互（fresh context 逐科）──
    for (const subject of SUBJECTS) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const started = Date.now();
      await page.goto(`${base}/law/${subject}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".law-subject__hero h1", { timeout: 60_000 });
      const interactiveMs = Date.now() - started;
      const heapMb = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize / (1024 * 1024) : null);
      spot[subject] = { interactiveMs, heapMb };
      await context.close();
    }

    // ── 缓存命中抽查：冷访问一课 → SW 接管 → 热访问同课，统计 /assets/*.json 命中率 ──
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      const rows = [];
      page.on("response", (r) => {
        const u = new URL(r.url());
        if (u.pathname.startsWith("/assets/") && u.pathname.endsWith(".json")) {
          rows.push({ path: u.pathname, sw: r.fromServiceWorker() });
        }
      });
      await page.goto(`${base}/law`);
      await page.evaluate(() => navigator.serviceWorker?.ready.catch(() => undefined));
      await page.goto(`${base}/law/learn/minfa-q031`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".law-player", { timeout: 60_000 });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector(".law-player", { timeout: 60_000 });
      await page.waitForTimeout(800);
      const warm = rows.slice(Math.floor(rows.length / 2)); // reload 后的那一半 ≈ 热访问
      const swHits = warm.filter((row) => row.sw).length;
      spot.cacheHit = warm.length > 0 ? Math.round((swHits / warm.length) * 100) : 0;
      spot.cacheHitsDetail = `${swHits}/${warm.length}`;
      await context.close();
    }
  } finally {
    await browser.close();
    child.kill();
  }

  // ── 报告 ──
  const lines = [
    "# law 容量终审报告（S6·T5）",
    "",
    `- 时间：${new Date().toISOString()}`,
    `- 基线：D 会话（2026-09-07 夜）/ S6 改前（2026-09-09 凌晨 T1 动工前）`,
    "",
    "## ① 五科 chunk 体积（磁盘 raw / gzip）",
    "",
    "| 科目 | meta | 正文 parts | 分层 light | 分层 tail | 合计 |",
    "|---|---|---|---|---|---|",
    ...SUBJECTS.map((subject) => {
      const inv = inventory[subject];
      const total = inv.meta + inv.parts + inv.light + inv.tail;
      const totalGz = inv.metaGz + inv.partsGz + inv.lightGz + inv.tailGz;
      return `| ${subject} | ${KB(inv.meta)}/${KB(inv.metaGz)}gz (${inv.counts.meta}) | ${KB(inv.parts)}/${KB(inv.partsGz)}gz (${inv.counts.parts}) | ${KB(inv.light)} (${inv.counts.light}) | ${KB(inv.tail)} (${inv.counts.tail}) | ${KB(total)}/${KB(totalGz)}gz |`;
    }),
    "",
    "## ② 最大课时 & ③ 最坏课时打开传输（vs 基线）",
    "",
    "| 科目 | 最大课（磁盘） | 伴生文件 | 改前基线打开传输 | 当前打开传输 | 变化 |",
    "|---|---|---|---|---|---|",
    ...SUBJECTS.map((subject) => {
      const max = maxLessons[subject];
      const before = S6_BEFORE.worstLessonRaw[subject];
      // 当前最坏打开传输 ≈ meta + (分层课 ? 本课 light : 完整课所在 part 的该课字节)
      const layeredNow = max.lightBytes > 0;
      const openNow = inventory[subject].meta + (layeredNow ? max.lightBytes : max.bytes);
      const delta = Math.round(((openNow - before) / before) * 100);
      return `| ${subject} | ${max.id} ${KB(max.bytes)} | ${max.companionFiles} | ${KB(before)} | ${KB(openNow)}${layeredNow ? "（分层轻视图）" : ""} | ${delta > 0 ? "+" : ""}${delta}% |`;
    }),
    "",
    "## ④ JSON 解析内存（整本装配 heap，preview 口径）",
    "",
    "| 科目 | D 基线 heap | 当前 heap | 变化 |",
    "|---|---|---|---|",
    ...SUBJECTS.map((subject) => {
      const now = spot[subject].heapMb;
      const base = D_BASELINE.bookHeapMb[subject];
      const delta = now && base ? Math.round(((now - base) / base) * 100) : "n/a";
      return `| ${subject} | ${base}MB | ${now?.toFixed(1) ?? "n/a"}MB | ${typeof delta === "number" ? `${delta > 0 ? "+" : ""}${delta}%` : delta} |`;
    }),
    "",
    "## ⑤ lighthouse 式自建抽查",
    "",
    "| 科目 | 学科页可交互 | 整本 heap |",
    "|---|---|---|",
    ...SUBJECTS.map((subject) => `| ${subject} | ${spot[subject].interactiveMs}ms | ${spot[subject].heapMb?.toFixed(1) ?? "n/a"}MB |`),
    "",
    `- 缓存命中（同课热访问 /assets/*.json）：**${spot.cacheHit}%**（${spot.cacheHitsDetail}，SW 接管后）`,
    "",
  ];
  const report = lines.join("\n");
  await writeFile(join(root, ".tmp", "law-capacity-report.md"), report, "utf8");
  console.log(report);
  console.log("📎 报告已写入 .tmp/law-capacity-report.md");
}

await main();
