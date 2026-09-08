// 法学模块发布报告（S3·T5）：晨间报告直接引用的一页快照。
//   npm run law:release-report [-- --since <commit>] [--with-perf] [--skip-metrics]
// 输出：stdout（markdown）+ .tmp/law-release-report.md
//
// 组成：
//   ① 部署状态：线上 release.json 的 commit vs 本地 HEAD（含未部署提示）
//   ② 本次区间 commit 清单 + 变更文件（law 相关单独一行）
//   ③ law 指标快照：law:scan（回潮门禁）/ law:quizsim（出题仿真 vs 基线）/
//      law:contrast（对比度）——任一脚本失败记为 ⚠ 而不中断整份报告
//      （--with-perf 追加 law:perf，慢速指标默认不跑）
//   ④ CI / e2e：gh 读取最近工作流结论（无 gh 或未登录时降级为提示行）
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const root = process.cwd();
const args = process.argv.slice(2);
const sinceArg = args.includes("--since") ? args[args.indexOf("--since") + 1] : undefined;
const withPerf = args.includes("--with-perf");
const skipMetrics = args.includes("--skip-metrics");

const OUT = [];
const say = (line = "") => OUT.push(line);

function sh(cmd, cmdArgs, opts = {}) {
  // npm 在 win32 需要 shell 解析 .cmd 垫片；git/gh/curl 直接 spawn（避免 shell 拼接的弃用告警）
  const needsShell = cmd === "npm" || cmd === "npm.cmd";
  return spawnSync(needsShell && process.platform === "win32" ? "npm.cmd" : cmd, cmdArgs, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    timeout: opts.timeout ?? 120_000,
    ...opts,
  });
}

function shText(cmd, cmdArgs, opts) {
  const r = sh(cmd, cmdArgs, opts);
  return r.status === 0 ? String(r.stdout).trim() : null;
}

// ── ① 部署状态 ────────────────────────────────────────────────────────
const PROD = "https://shoot.custard.top";
let liveCommit = null;
let liveBuiltAt = null;
try {
  const res = spawnSync("curl", ["-s", `${PROD}/release.json`], { encoding: "utf8", timeout: 20_000 });
  const parsed = JSON.parse(String(res.stdout));
  liveCommit = parsed.commit;
  liveBuiltAt = parsed.builtAt;
} catch {
  /* 离线/站点不可达：降级为 null */
}
const headCommit = shText("git", ["rev-parse", "HEAD"]);
const headShort = headCommit?.slice(0, 7) ?? "?";
const liveShort = liveCommit?.slice(0, 7) ?? "?";

const since =
  sinceArg ??
  (liveCommit && headCommit && liveCommit !== headCommit
    ? `${liveCommit}..HEAD`
    : liveCommit
      ? `${liveCommit}..HEAD`
      : "origin/main..HEAD");

say(`# 法学模块发布报告`);
say();
say(`- 生成时间：${new Date().toISOString()}`);
say(`- 本地 HEAD：\`${headShort}\``);
say(`- 线上部署：\`${liveShort}\`（builtAt ${liveBuiltAt ?? "?"}）`);
if (liveCommit && headCommit) {
  const deployed = sh("git", ["merge-base", "--is-ancestor", headCommit, liveCommit]).status === 0;
  say(
    deployed
      ? `- 部署状态：✅ HEAD 已上线（release.json 含本地提交）`
      : `- 部署状态：⏳ HEAD 尚未上线（等待 Cloudflare Pages 构建完成）`,
  );
}
say();

// ── ② commit 区间与变更文件 ───────────────────────────────────────────
say(`## 变更区间 \`${since}\``);
say();
const logLines = shText("git", ["log", "--oneline", since]);
if (logLines) {
  const commits = logLines.split(/\r?\n/).filter(Boolean);
  say(`共 ${commits.length} 个提交：`);
  say();
  for (const c of commits) say(`- ${c}`);
} else {
  say(`- （区间为空或无法解析）`);
}
say();

const diffStat = shText("git", ["diff", "--stat", since]);
if (diffStat) {
  const files = diffStat.split(/\r?\n/).filter((l) => l.includes("|")).map((l) => l.trim());
  const lawFiles = files.filter((l) => /(^|\/)(law|e2e\/law|scripts\/(build-law|scan-law|law-))|(QuizRunner|LessonPlayer|StepStage|law-)/.test(l));
  say(`### 变更文件（共 ${files.length}，law 相关 ${lawFiles.length}）`);
  say();
  say("```");
  for (const f of files.slice(0, 30)) say(f);
  if (files.length > 30) say(`… 其余 ${files.length - 30} 项`);
  say("```");
  if (lawFiles.length > 0) {
    say("<details><summary>law 相关文件</summary>");
    say();
    say("```");
    for (const f of lawFiles) say(f);
    say("```");
    say("</details>");
  }
}
say();

// ── ③ law 指标快照 ───────────────────────────────────────────────────
say(`## law 指标快照`);
say();

function metric(label, cmd, cmdArgs, pick) {
  if (skipMetrics) return say(`- ${label}：--skip-metrics 已跳过`);
  say(`- ${label}：`);
  const r = sh(cmd, cmdArgs, { timeout: 300_000 });
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  if (!output) return say(`  - ⚠ 无输出（exit ${r.status}）`);
  for (const line of pick(output)) say(`  - ${line}`);
  if (r.status !== 0) say(`  - ❌ 退出码 ${r.status}（门禁红）`);
}

metric(
  "内容残留扫描（law:scan）",
  "node",
  ["scripts/scan-law-content.mjs"],
  (out) => {
    const total = /残留扫描（(\d+) 条）/.exec(out)?.[1];
    const cats = out
      .split(/\r?\n/)
      .filter((l) => /^[a-z-]+: \d+/.test(l.trim()))
      .map((l) => l.trim());
    const verdict = /✓ 残留下降[：:] (\d+) < 基线 (\d+)/.exec(out);
    const regress = /✗ 内容回潮/.test(out);
    return [
      `总量 ${total ?? "?"} 条${verdict ? `（基线 ${verdict[2]}，下降中 ✓）` : regress ? "（❌ 超基线，回潮）" : "（= 基线）"}`,
      ...cats,
    ];
  },
);

metric(
  "出题仿真（law:quizsim，vs scripts/law-quizsim-baseline.json）",
  "node",
  ["--import", "tsx", "scripts/law-quiz-sim.mts"],
  (out) => {
    const lines = out.split(/\r?\n/).filter((l) => /题型|选项|否题|闸门|PASS|FAIL|倒退|基线|✓|✗/.test(l));
    return lines.length > 0 ? lines.slice(0, 12) : [`输出 ${out.split(/\r?\n/).length} 行（未见摘要行）`];
  },
);

metric(
  "对比度审计（law:contrast @ 生产站，WCAG 3:1/4.5:1）",
  "node",
  ["scripts/law-contrast-check.mjs", PROD],
  (out) => {
    const total = /总计:\s*(\d+)/.exec(out)?.[1];
    const dist = out
      .split(/\r?\n/)
      .filter((l) => /^[a-z\u4e00-\u9fa5]+\/[a-z]+\/[a-z]+\//.test(l.trim()))
      .map((l) => l.trim());
    return [
      total === "0" || total === undefined ? "0 违规 ✅" : `❌ ${total} 条违规（明细 .tmp/contrast/violations.json）`,
      ...dist.slice(0, 8),
    ];
  },
);

if (withPerf) {
  metric(
    "性能基线（law:perf，五科首屏/课时打开/传输量）",
    "node",
    ["scripts/law-perf-check.mjs"],
    (out) => {
      const lines = out.split(/\r?\n/).filter((l) => /P50|P95|预算|超|✓|✗|raw|gzip/i.test(l));
      return lines.length > 0 ? lines.slice(0, 15) : [`明细 → .tmp/law-perf-report.md`];
    },
  );
} else {
  say(`- 性能基线（law:perf）：默认未跑（加 --with-perf；独立 preview 实例，约数分钟）`);
}
say();

// ── ④ CI / e2e ───────────────────────────────────────────────────────
say(`## CI / e2e`);
say();
const ghRuns = shText("gh", ["run", "list", "--branch", "main", "--limit", "3", "--json", "displayTitle,conclusion,status,createdAt,headSha,url"]);
if (ghRuns) {
  try {
    const runs = JSON.parse(ghRuns);
    for (const run of runs) {
      const icon = run.conclusion === "success" ? "✅" : run.conclusion === "failure" ? "❌" : run.status === "in_progress" ? "⏳" : "⚠️";
      say(`- ${icon} ${run.headSha.slice(0, 7)} ${run.displayTitle}（${run.conclusion ?? run.status}，${run.createdAt}）`);
      say(`  ${run.url}`);
    }
    say(`- e2e：随 CI \`npm run test:e2e\`（摄影站 + 法学全量）执行；结论见上表。`);
  } catch {
    say(`- gh 输出解析失败：${ghRuns.slice(0, 120)}`);
  }
} else {
  say(`- gh 不可用或未认证：CI 状态请看 https://github.com/Muguett-DBY/naihuangbao-photography/actions`);
}
say();

// ── 输出 ─────────────────────────────────────────────────────────────
const text = OUT.join("\n");
mkdirSync(`${root}/.tmp`, { recursive: true });
writeFileSync(`${root}/.tmp/law-release-report.md`, text, "utf8");
console.log(text);
console.error(`\n（已写入 .tmp/law-release-report.md）`);
