// law 一键夜间健康检查（P5·T4）：npm run law:nightly
// 按序跑完全部巡逻脚本：scan → contrast → a11y → quizsim → perf → runtime → offline → live，
// 每步独立捕获退出码/耗时/日志（.tmp/law-nightly-logs/<step>.log），
// 汇总为结构化报告 .tmp/law-nightly-report.json；任何一步非零退出 → 整体退出 1。
// 某步失败不中断后续步骤（一次夜间跑出全部信号，而不是逐个排雷）。
//
// 服务器拓扑：
//   scan/quizsim        纯 node，无需服务器
//   contrast/a11y       复用本脚本启动的独立 vite preview（dist 产物，随机空闲端口）
//   perf/runtime/offline 各自内部自起 preview（既有行为，不动）
//   live                默认打生产站 https://shoot.custard.top/law（LAW_NIGHTLY_LIVE_BASE 可覆盖）
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const LOG_DIR = join(root, ".tmp", "law-nightly-logs");
const REPORT_FILE = join(root, ".tmp", "law-nightly-report.json");
const LIVE_BASE = process.env.LAW_NIGHTLY_LIVE_BASE ?? "https://shoot.custard.top/law";

/** 顺序与超时（ms）；retries: 失败后等 60s 重试次数（端口冲突场景，见协作协议） */
const STEPS = [
  { name: "scan", script: "law:scan", timeout: 5 * 60_000 },
  { name: "contrast", script: "law:contrast", needsBase: true, timeout: 10 * 60_000 },
  { name: "a11y", script: "law:a11y", needsBase: true, timeout: 15 * 60_000 },
  { name: "quizsim", script: "law:quizsim", timeout: 10 * 60_000 },
  { name: "perf", script: "law:perf", timeout: 25 * 60_000 },
  { name: "runtime", script: "law:runtime", timeout: 25 * 60_000 },
  { name: "offline", script: "law:offline", timeout: 30 * 60_000, retries: 2 },
  { name: "live", script: "law:live", args: () => [LIVE_BASE], timeout: 5 * 60_000 },
];
/** LAW_NIGHTLY_STEPS=scan,perf 可只跑子集（修复后的定向复跑），默认全量 */
const ACTIVE_STEPS = process.env.LAW_NIGHTLY_STEPS
  ? STEPS.filter((step) => process.env.LAW_NIGHTLY_STEPS.split(",").includes(step.name))
  : STEPS;

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

/** 独立 preview 实例（不经 shell，Windows 上 kill 才真正生效；与 law-perf 同法） */
async function startPreview(port) {
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
  throw new Error("nightly preview server did not start");
}

async function runStep(step, base) {
  const args = ["run", step.script];
  if (step.args) args.push(...step.args());
  if (step.needsBase && base) args.push("--", base);
  const attempts = 1 + (step.retries ?? 0);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const startedAt = Date.now();
    // shell 模式下 npm 在 Windows 是 npm.cmd：命令串拼接（参数全部为脚本名/URL，无用户输入）
    const result = spawnSync(`npm ${args.join(" ")}`, {
      cwd: root,
      timeout: step.timeout,
      encoding: "utf8",
      env: process.env,
      shell: true,
    });
    const durationMs = Date.now() - startedAt;
    const log = `# npm ${args.join(" ")}\n# attempt ${attempt}/${attempts}, exit=${result.status}, ${durationMs}ms\n\n${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    if (result.status === 0 || attempt === attempts) {
      return { exitCode: result.status, durationMs, log, timedOut: result.signal === "SIGTERM", attempts: attempt };
    }
    console.log(`  ↻ ${step.name} 第 ${attempt} 次失败（exit ${result.status}），60s 后重试（端口冲突协议）`);
    await new Promise((wait) => setTimeout(wait, 60_000));
  }
}

async function main() {
  const distReady = await stat(join(root, "dist", "index.html")).catch(() => null);
  if (!distReady) {
    console.error("dist/ 不存在：law:nightly 需要构建产物（npm run build）作为巡逻对象");
    process.exit(2);
  }

  await mkdir(LOG_DIR, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    liveBase: LIVE_BASE,
    steps: [],
    summary: null,
  };

  // contrast/a11y 共用的独立 preview 实例
  let preview = null;
  const needsPreview = ACTIVE_STEPS.some((step) => step.needsBase);
  if (needsPreview) {
    const port = await freePort(4391);
    preview = await startPreview(port);
    console.log(`nightly preview: ${preview.base}`);
  }

  try {
    for (const step of ACTIVE_STEPS) {
      console.log(`\n▶ ${step.name}（npm run ${step.script}${step.needsBase ? ` ${preview.base}` : ""}）`);
      const outcome = await runStep(step, preview?.base);
      await writeFile(join(LOG_DIR, `${step.name}.log`), outcome.log, "utf8");
      const tail = outcome.log.split("\n").filter(Boolean).slice(-4).join("\n");
      console.log(outcome.exitCode === 0 ? `✅ ${step.name} 通过（${(outcome.durationMs / 1000).toFixed(0)}s）` : `❌ ${step.name} 失败（exit ${outcome.exitCode}${outcome.timedOut ? "，超时强杀" : ""}，${(outcome.durationMs / 1000).toFixed(0)}s）\n${tail}\n  完整日志: .tmp/law-nightly-logs/${step.name}.log`);
      report.steps.push({
        step: step.name,
        script: step.script,
        exitCode: outcome.exitCode,
        durationMs: outcome.durationMs,
        timedOut: outcome.timedOut,
        attempts: outcome.attempts,
        logFile: join(".tmp", "law-nightly-logs", `${step.name}.log`),
      });
    }
  } finally {
    preview?.child.kill();
  }

  const failed = report.steps.filter((step) => step.exitCode !== 0);
  report.summary = {
    total: report.steps.length,
    passed: report.steps.length - failed.length,
    failed: failed.length,
    failedSteps: failed.map((step) => step.step),
    totalMs: report.steps.reduce((sum, step) => sum + step.durationMs, 0),
    success: failed.length === 0,
  };
  await writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("\n=== law:nightly 汇总 ===");
  for (const step of report.steps) {
    console.log(`  ${step.exitCode === 0 ? "✅" : "❌"} ${step.step.padEnd(9)} exit=${step.exitCode}  ${(step.durationMs / 1000).toFixed(0)}s${step.attempts > 1 ? `  (${step.attempts} 次尝试)` : ""}`);
  }
  console.log(`\n${report.summary.success ? "✅ 夜间全绿" : `❌ ${failed.length} 步失败: ${report.summary.failedSteps.join("、")}`} ｜ 报告: .tmp/law-nightly-report.json ｜ 总耗时 ${(report.summary.totalMs / 60000).toFixed(1)}min`);
  process.exit(report.summary.success ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
