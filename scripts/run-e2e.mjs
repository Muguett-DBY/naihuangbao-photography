// E2E 顺序执行：
// 工作室/画布类测试（WebGL + IndexedDB）在跨项目并行时会被 CPU 竞争拖垮超时，
// 因此先跑常规套件（2 workers），再独占 1 个 worker 串行跑 V7 工作区测试。
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
status = Math.max(status, run("V7 工作区（独占 1 worker）", ["--project", "webgl-studio", ...process.argv.slice(2)]));
process.exit(status);
