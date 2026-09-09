// bundle 趋势报告（P5·T3）：npm run law:bundle-trend
// 对比当前 dist/assets 与上次构建的快照（.tmp/bundle-trend-previous.json，全量 chunk 明细），
// 按"去哈希的逻辑 chunk 名"对齐，输出新增 / 删除 / 体积变化超 5KB 的 chunk 清单，
// 用于发现意外体积膨胀（比如某个依赖被意外拖进主包、law 分块异常变大）。
//
// 与 bundle:analyze 的 dist/bundle-report.json 的关系：那份只存 top-15，做不了全量 diff；
// 本脚本自建全量快照并在报告里引用它的分类汇总作上下文。
//
// 退出码：默认始终 0（趋势是巡视信息）；--strict 时任何 chunk 增长 >5KB 退出 1（发布门禁用）。
import { gzipSync } from "node:zlib";
import { mkdir, readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const ASSETS_DIR = join(root, "dist", "assets");
const REPORT_FILE = join(root, "dist", "bundle-report.json");
const SNAPSHOT_FILE = join(root, ".tmp", "bundle-trend-previous.json");
const OUT_FILE = join(root, ".tmp", "law-bundle-trend.json");
const DIFF_THRESHOLD = 5 * 1024;
const STRICT = process.argv.includes("--strict");

const KB = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;

/** vite 产物名 name-HASH.ext → 逻辑 chunk 名 name（同名不同哈希 = 同一逻辑 chunk 的两个版本） */
function stemOf(file) {
  return file.replace(/-([A-Za-z0-9_-]{8})\.(js|mjs|css|json|woff2?|ttf|svg|png|webp|avif|jpg|jpeg)$/i, "");
}

function categoryOf(file) {
  if (file.endsWith(".js") || file.endsWith(".mjs")) return "js";
  if (file.endsWith(".css")) return "css";
  if (file.endsWith(".json")) return "json(law数据)";
  if (/\.(woff2?|ttf)$/.test(file)) return "font";
  return "其他静态资源";
}

async function snapshotCurrent() {
  const files = (await readdir(ASSETS_DIR)).filter((name) => !name.startsWith("."));
  const chunks = await Promise.all(
    files.map(async (file) => {
      const buf = await readFile(join(ASSETS_DIR, file));
      return { stem: stemOf(file), file, category: categoryOf(file), size: buf.length, gzip: gzipSync(buf).length };
    }),
  );
  // 同一逻辑 chunk 理论上只有一个哈希版本；若构建残留了新旧两份，取大者保守报警
  const byStem = new Map();
  for (const chunk of chunks) {
    const prev = byStem.get(chunk.stem);
    if (!prev || chunk.size > prev.size) byStem.set(chunk.stem, chunk);
  }
  return {
    generatedAt: new Date().toISOString(),
    total: { size: [...byStem.values()].reduce((sum, c) => sum + c.size, 0), chunks: byStem.size },
    chunks: [...byStem.values()].map(({ stem, category, size, gzip }) => ({ stem, category, size, gzip })),
  };
}

async function main() {
  let previous = null;
  try {
    previous = JSON.parse(await readFile(SNAPSHOT_FILE, "utf8"));
  } catch {
    // 首次运行：只记基线
  }

  const current = await snapshotCurrent();
  const prevByStem = new Map((previous?.chunks ?? []).map((c) => [c.stem, c]));
  const currByStem = new Map(current.chunks.map((c) => [c.stem, c]));

  const added = current.chunks.filter((c) => !prevByStem.has(c.stem));
  const removed = (previous?.chunks ?? []).filter((c) => !currByStem.has(c.stem));
  const changed = current.chunks
    .filter((c) => prevByStem.has(c.stem))
    .map((c) => {
      const prev = prevByStem.get(c.stem);
      return {
        stem: c.stem,
        category: c.category,
        prevSize: prev.size,
        size: c.size,
        delta: c.size - prev.size,
        deltaGzip: c.gzip - prev.gzip,
      };
    })
    .filter((c) => Math.abs(c.delta) > DIFF_THRESHOLD)
    .sort((a, b) => b.delta - a.delta);

  const grown = changed.filter((c) => c.delta > 0);
  const shrunk = changed.filter((c) => c.delta < 0);
  const totalDelta = previous ? current.total.size - previous.total.size : 0;

  // 上下文：bundle:analyze 的分类汇总（若存在）
  let analyzeContext = null;
  try {
    const report = JSON.parse(await readFile(REPORT_FILE, "utf8"));
    analyzeContext = {
      generatedAt: report.generatedAt,
      total: report.total,
      categories: report.categories,
    };
  } catch {
    // 没有 bundle-report.json（还没跑 bundle:analyze）——可接受
  }

  const trend = {
    generatedAt: current.generatedAt,
    comparedAgainst: previous?.generatedAt ?? null,
    thresholdBytes: DIFF_THRESHOLD,
    current: current.total,
    previous: previous?.total ?? null,
    totalDelta,
    added: added.map(({ stem, category, size, gzip }) => ({ stem, category, size, gzip })),
    removed: removed.map(({ stem, category, size }) => ({ stem, category, size })),
    grown,
    shrunk,
    analyzeContext,
  };
  await mkdir(join(root, ".tmp"), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(trend, null, 2)}\n`, "utf8");
  await writeFile(SNAPSHOT_FILE, `${JSON.stringify(current, null, 2)}\n`, "utf8");

  // ── 报告输出 ──
  console.log("=== law bundle 趋势 ===");
  if (!previous) {
    console.log(`首次运行：已记录基线快照（${current.total.chunks} 个逻辑 chunk，共 ${KB(current.total.size)}）。下次构建后运行即可看趋势。`);
  } else {
    console.log(`对比基线 ${previous.generatedAt} → 当前，总位移 ${totalDelta >= 0 ? "+" : ""}${KB(totalDelta)}（${previous.total.chunks} → ${current.total.chunks} 个 chunk）`);
    const list = (title, items, fmt) => {
      console.log(`\n${title}（${items.length}）`);
      for (const item of items) console.log(`  ${fmt(item)}`);
      if (items.length === 0) console.log("  （无）");
    };
    list("新增 chunk", added, (c) => `+ ${KB(c.size)}  ${c.stem}`);
    list("删除 chunk", removed, (c) => `- ${KB(c.size)}  ${c.stem}`);
    list("增长超 5KB", grown, (c) => `↑ ${c.stem}  ${KB(c.prevSize)} → ${KB(c.size)}（+${KB(c.delta)}，gzip ${c.deltaGzip >= 0 ? "+" : ""}${KB(c.deltaGzip)}）`);
    list("缩小超 5KB", shrunk, (c) => `↓ ${c.stem}  ${KB(c.prevSize)} → ${KB(c.size)}（${KB(c.delta)}）`);
  }
  console.log(`\nJSON 报告: .tmp/law-bundle-trend.json ｜ 快照: .tmp/bundle-trend-previous.json`);

  if (STRICT && grown.length > 0) {
    console.error(`\n❌ --strict：${grown.length} 个 chunk 增长超 5KB`);
    process.exit(1);
  }
}

try {
  await stat(ASSETS_DIR);
} catch {
  console.error("dist/assets 不存在：先 npm run build 再跑趋势对比");
  process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
