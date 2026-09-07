// 法学模块运行时性能抽查：4x CPU 降速 + longtask 观测
//   ① 647 节点路径地图：首屏渲染 / 滚动全图 / 快速点节点
//   ② 搜索快速连击：连续输入清空多组关键词
//   ③ 步骤快速切换：连续"下一步"直到自测
// 观测口径：PerformanceObserver longtask（buffered），>100ms 记录归属脚本与时长
// 运行：npm run law:runtime（独立 preview 实例）
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const THROTTLE = 4;
const LONGTASK_MS = 100;

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
      if ((await fetch(`${base}/release.json`)).ok) return { child, base };
    } catch {
      // not ready
    }
  }
  child.kill();
  throw new Error("preview did not start");
}

const OBSERVER_INIT = `(() => {
  window.__longtasks = [];
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__longtasks.push({
          duration: Math.round(entry.duration),
          start: Math.round(entry.startTime),
          attribution: (entry.attribution ?? []).map((a) => a.name).join(","),
        });
      }
    });
    observer.observe({ type: "longtask", buffered: true });
  } catch { /* longtask 不支持时静默 */ }
})();`;

async function newThrottledPage(browser, base) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
  await page.addInitScript(OBSERVER_INIT);
  await page.goto(base + "/law");
  await page.evaluate(() => navigator.serviceWorker?.ready.catch(() => undefined));
  return { context, page };
}

async function longtasksOf(page) {
  const tasks = await page.evaluate(() => window.__longtasks ?? []);
  return tasks.filter((task) => task.duration > LONGTASK_MS);
}

async function main() {
  const dist = await stat(join(root, "dist", "index.html")).catch(() => null);
  if (!dist) {
    console.error("dist/ 不存在：先 npm run build");
    process.exit(2);
  }
  const port = await freePort(4214);
  const { child, base } = await startPreview(port);
  const browser = await chromium.launch();
  const findings = [];

  try {
    // ① 647 节点路径地图（minfa）
    {
      const { context, page } = await newThrottledPage(browser, base);
      await page.goto(`${base}/law/minfa`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".law-path", { timeout: 60_000 });
      await page.waitForTimeout(1500); // 让入场动画/渲染 settle
      const mapTasks = await longtasksOf(page);

      // 滚动整张地图
      await page.evaluate(() => {
        const path = document.querySelector(".law-path");
        (path ?? document.scrollingElement)?.scrollTo?.(0, 999999);
        return undefined;
      });
      for (let i = 0; i < 12; i += 1) {
        await page.mouse.wheel(0, 1200);
        await page.waitForTimeout(120);
      }
      // 快速点击前 8 个路径节点（SPA 导航）
      const nodes = page.locator(".law-path__node a, .law-path__node");
      const nodeCount = await nodes.count();
      for (let i = 0; i < Math.min(8, nodeCount); i += 1) {
        await nodes.nth(i).click({ force: true, timeout: 5000 }).catch(() => undefined);
        await page.waitForTimeout(150);
      }
      await page.waitForTimeout(800);
      const scrollTasks = (await longtasksOf(page)).slice(mapTasks.length);

      const all = [...mapTasks, ...scrollTasks];
      findings.push({ scene: `路径地图(${nodeCount} 节点, CPU ${THROTTLE}x)`, tasks: all });
      await context.close();
    }

    // ② 搜索快速连击（xianfa 目录页）
    {
      const { context, page } = await newThrottledPage(browser, base);
      await page.goto(`${base}/law/xianfa`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".law-search__box input", { timeout: 60_000 });
      const input = page.locator(".law-search__box input");
      for (const query of ["根", "根本", "根本制", "选举", "权 利", "宪法修", "公民", "", "监督", "宪 法"]) {
        await input.fill("");
        await input.pressSequentially(query, { delay: 15 }).catch(() => undefined);
        await page.waitForTimeout(80);
      }
      await page.waitForTimeout(800);
      findings.push({ scene: "搜索快速连击(CPU 4x)", tasks: await longtasksOf(page) });
      await context.close();
    }

    // ③ 步骤快速切换（falixue 完整学习流）
    {
      const { context, page } = await newThrottledPage(browser, base);
      await page.goto(`${base}/law/learn/falixue-q052`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".law-player", { timeout: 60_000 });
      const nav = page.locator(".law-player__nav.is-primary");
      for (let i = 0; i < 20; i += 1) {
        if (!(await nav.isVisible().catch(() => false))) break;
        await nav.click({ force: true, timeout: 4000 }).catch(() => undefined);
        await page.waitForTimeout(60);
      }
      await page.waitForTimeout(800);
      findings.push({ scene: "步骤快速切换×20(CPU 4x)", tasks: await longtasksOf(page) });
      await context.close();
    }
  } finally {
    await browser.close();
    child.kill();
  }

  const lines = [`# law 运行时抽查（CPU ${THROTTLE}x，阈值 ${LONGTASK_MS}ms）`, ""];
  let worst = 0;
  for (const finding of findings) {
    const worstTask = finding.tasks.reduce((max, task) => Math.max(max, task.duration), 0);
    worst = Math.max(worst, worstTask);
    lines.push(`## ${finding.scene} — >100ms 长任务 ${finding.tasks.length} 个，最差 ${worstTask}ms`);
    for (const task of finding.tasks.slice(0, 8)) {
      lines.push(`- ${task.duration}ms @${task.start}ms [${task.attribution || "unknown"}]`);
    }
    lines.push("");
  }
  const report = lines.join("\n");
  console.log(report);
  await writeFile(join(root, ".tmp", "law-runtime-report.md"), report, "utf8");
  console.log(worst > LONGTASK_MS ? `⚠️ 存在 ${worst}ms 长任务` : "✅ 无 >100ms 长任务");
}

await main();
