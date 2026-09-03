// E2E 顺序执行：
// 环境敏感测试（WebGL 工作区/沉浸画廊）独占 worker 串行，其余常规套件并行，
// 避免 GPU 相关初始化在 CI 容器里被并行竞争拖垮。
import { spawnSync } from "node:child_process";

function run(label, args) {
  console.log(`\n===== ${label} =====`);
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["playwright", "test", "-c", "e2e/playwright.config.ts", ...args],
    { stdio: "inherit", shell: process.platform === "win32" },
  );
  return result.status ?? 1;
}

let status = 0;
status = Math.max(status, run("常规套件（2 workers）", ["--project", "default", ...process.argv.slice(2)]));
status = Math.max(status, run("环境敏感套件（独占 1 worker）", ["--project", "env-sensitive", ...process.argv.slice(2)]));
process.exit(status);
