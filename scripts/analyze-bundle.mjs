import { readdir, stat, writeFile, readFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { gzipSync } from "node:zlib";

const assetsDir = join(process.cwd(), "dist", "assets");
const reportFile = join(process.cwd(), "dist", "bundle-report.json");

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function classify(filename) {
  const name = basename(filename);
  if (name.startsWith("index-") && name.endsWith(".js")) return "main-js";
  if (name.startsWith("index-") && name.endsWith(".css")) return "main-css";
  if (name.endsWith(".js")) return "lazy-js";
  if (name.endsWith(".css")) return "lazy-css";
  if (name.endsWith(".woff") || name.endsWith(".woff2") || name.endsWith(".ttf")) return "font";
  if (name.endsWith(".svg") || name.endsWith(".png") || name.endsWith(".webp") || name.endsWith(".jpg") || name.endsWith(".avif")) return "image";
  if (name.endsWith(".html")) return "html";
  if (name.endsWith(".json")) return "json";
  return "other";
}

async function main() {
  const files = await readdir(assetsDir);
  const stats = await Promise.all(
    files.map(async (file) => {
      const full = join(assetsDir, file);
      const s = await stat(full);
      const buf = await readFile(full);
      const gz = gzipSync(buf, { level: 9 });
      return {
        file,
        size: s.size,
        gzip: gz.length,
        category: classify(file),
      };
    }),
  );

  const total = stats.reduce((sum, item) => sum + item.size, 0);
  const totalGzip = stats.reduce((sum, item) => sum + item.gzip, 0);

  const byCategory = new Map();
  for (const item of stats) {
    const bucket = byCategory.get(item.category) ?? { count: 0, size: 0, gzip: 0 };
    bucket.count += 1;
    bucket.size += item.size;
    bucket.gzip += item.gzip;
    byCategory.set(item.category, bucket);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    total: { size: total, gzip: totalGzip },
    categories: Array.from(byCategory.entries()).map(([name, data]) => ({ name, ...data })),
    top: [...stats].sort((a, b) => b.size - a.size).slice(0, 15),
  };

  await writeFile(reportFile, JSON.stringify(report, null, 2), "utf8");

  console.log("\nBundle size report");
  console.log("==================");
  console.log(`Total: ${formatBytes(report.total.size)} (${formatBytes(report.total.gzip)} gz)`);
  console.log("");
  console.log("By category:");
  for (const cat of report.categories) {
    console.log(`  ${cat.name.padEnd(10)} ${String(cat.count).padStart(4)} files  ${formatBytes(cat.size).padStart(10)}  (${formatBytes(cat.gzip)} gz)`);
  }
  console.log("");
  console.log("Top 15 largest files:");
  for (const item of report.top) {
    console.log(`  ${formatBytes(item.size).padStart(10)}  ${formatBytes(item.gzip).padStart(10)} gz  ${item.file}`);
  }
  console.log("");
  console.log(`Detailed report written to: ${reportFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
