// law 模块可达性巡逻（S4 · T6 长期回归工具）：npm run law:a11y
// 六页 × 双主题静态 DOM 审计 + 键盘行为走查 + 弹层 focus trap 行为验证 + 对比度（复用 law:contrast）。
// 产出 .tmp/a11y/report.json；存在 error 级问题退出码非零。
import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5189";
const PAGES = [
  { name: "学习中心", url: "/law" },
  { name: "学科页", url: "/law/xingfa" },
  { name: "课时页", url: "/law/learn/xingfa-q047" },
  { name: "图解页", url: "/law/graphic/xingfa-q083" },
  { name: "错题本", url: "/law/wrongbook" },
  { name: "统计页", url: "/law/stats" },
];

// 预置进度/彩蛋（脚本结束清理）：不造 completedAt（避免里程碑彩蛋自动弹信打断走查），
// 预解锁时段信让图鉴有卡片可重读
const SEED = `(() => {
  try {
    localStorage.setItem("nhb-law-progress", JSON.stringify({
      xingfa_q001: { stepsDone: { "xingfa-q001-s0": true }, quizBest: 0, quizTotal: 0, wrongCount: 0, lastVisitedAt: 1 },
      xingfa_q047: { stepsDone: { "xingfa-q047-s0": true }, quizBest: 0, quizTotal: 0, wrongCount: 0, lastVisitedAt: 2 },
    }));
    localStorage.setItem("nhb-law-egg-v1", JSON.stringify({
      unlocked: { midnight: true, morning: true, firstLesson: true, symbol: true },
      seenAt: {}, unlockedAt: {},
    }));
  } catch {}
})();`;

/** 静态 DOM 审计：可达名 / aria 引用有效性 / dialog 结构 */
const STATIC_AUDIT = `(() => {
  const issues = [];
  const issue = (severity, check, detail) => issues.push({ severity, check, detail });
  const interactive = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  const all = [...document.querySelectorAll("body *")];
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 2 && r.height >= 2;
  };
  const inAriaHidden = (el) => el.closest('[aria-hidden="true"]') !== null;
  const accName = (el) => {
    const labelledby = el.getAttribute("aria-labelledby");
    if (labelledby) {
      const name = labelledby.split(/\\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim();
      if (name) return name;
    }
    const label = el.getAttribute("aria-label");
    if (label && label.trim()) return label.trim();
    if (el.id) {
      const lab = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (lab?.textContent.trim()) return lab.textContent.trim();
    }
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (el.placeholder?.trim()) return el.placeholder.trim();
      if (el.value?.trim()) return el.value.trim();
    }
    const own = (el.textContent ?? "").trim();
    if (own) return own;
    if (el.getAttribute("title")?.trim()) return el.getAttribute("title").trim();
    const img = el.querySelector("img[alt]");
    if (img?.getAttribute("alt")?.trim()) return img.getAttribute("alt").trim();
    return "";
  };

  const seenIds = new Set();
  for (const el of all) {
    if (el.id) {
      if (seenIds.has(el.id)) issue("warning", "dup-id", "重复 id #" + el.id);
      seenIds.add(el.id);
    }
    for (const attr of ["aria-labelledby", "aria-describedby"]) {
      const refs = el.getAttribute(attr);
      if (!refs) continue;
      for (const id of refs.split(/\\s+/)) {
        if (!document.getElementById(id)) {
          issue(attr === "aria-labelledby" ? "error" : "warning", "aria-ref",
            el.tagName.toLowerCase() + ' 的 ' + attr + ' 引用了不存在的 #' + id);
        }
      }
    }
    if (!visible(el) || inAriaHidden(el)) continue;
    const role = el.getAttribute("role");
    if (role === "dialog") {
      if (el.getAttribute("aria-modal") !== "true") issue("error", "dialog-structure", "role=dialog 缺 aria-modal=true");
      if (!accName(el)) issue("error", "dialog-structure", "role=dialog 缺可达名（aria-label/labelledby）");
    }
    if (!el.matches(interactive)) continue;
    if (el.matches('input[type="hidden"], [disabled], [aria-disabled="true"]')) continue;
    if (!accName(el)) {
      issue("error", "accessible-name",
        el.tagName.toLowerCase() + "." + String(el.className).split(" ").slice(0, 2).join(".") + " 无可达名（文本/aria-label/label/title 均空）: " + (el.textContent ?? "").trim().slice(0, 20));
    }
    for (const attr of ["aria-expanded", "aria-pressed"]) {
      const v = el.getAttribute(attr);
      if (v !== null && v !== "true" && v !== "false") {
        issue("error", "aria-state", el.tagName.toLowerCase() + " 的 " + attr + '="' + v + '" 不是布尔字面量');
      }
    }
    const desc = el.getAttribute("aria-activedescendant");
    if (desc) {
      const target = document.getElementById(desc);
      if (!target) issue("error", "activedescendant", "aria-activedescendant 引用了不存在的 #" + desc);
      else if (target.getAttribute("role") !== "option") issue("error", "activedescendant", "#" + desc + " 不是 role=option");
    }
    const controls = el.getAttribute("aria-controls");
    if (controls && !document.getElementById(controls)) {
      issue("warning", "aria-ref", "aria-controls 引用的 #" + controls + " 当前未渲染（条件渲染可接受，人工确认）");
    }
  }
  return issues;
})()`;

const browser = await chromium.launch();
const report = { base: BASE, generatedAt: new Date().toISOString(), pages: [], dialogs: [], summary: { errors: 0, warnings: 0 } };
const count = (issues) => {
  for (const i of issues) report.summary[i.severity] += 1;
};

for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(([t, seed]) => {
    localStorage.setItem("theme", t);
    try {
      eval(seed);
    } catch {}
  }, [theme, SEED]);

  for (const pg of PAGES) {
    const entry = { page: pg.name, url: pg.url, theme, issues: [] };
    await page.goto(BASE + pg.url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(600);
    // 滚动到底触发懒加载内容后再审计
    for (let i = 0; i < 5; i += 1) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.9));
      await page.waitForTimeout(200);
      const atEnd = await page.evaluate(() => Math.abs(window.scrollY + window.innerHeight - document.documentElement.scrollHeight) < 4);
      if (atEnd) break;
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(250);

    const staticIssues = await page.evaluate(STATIC_AUDIT).catch((e) => [{ severity: "error", check: "script", detail: "静态审计执行失败: " + e.message }]);
    entry.issues.push(...staticIssues);
    count(staticIssues);

    // 键盘走查：60 步 Tab，连续 ≥3 次落空（焦点掉 body 且再按仍在 body）才算真死端；
    // 走到页面末尾后焦点移出文档属浏览器正常行为，不算
    let consecutiveBody = 0;
    let worstStreak = 0;
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur()).catch(() => {});
    await page.keyboard.press("Tab");
    for (let i = 0; i < 60; i += 1) {
      const onBody = await page.evaluate(() => document.activeElement === document.body || document.activeElement === document.documentElement);
      consecutiveBody = onBody ? consecutiveBody + 1 : 0;
      worstStreak = Math.max(worstStreak, consecutiveBody);
      await page.keyboard.press("Tab");
    }
    if (worstStreak >= 3) {
      const issue = [{ severity: "error", check: "tab-walk", detail: "Tab 走查出现 " + worstStreak + " 连续落空（键盘死端）" }];
      entry.issues.push(...issue);
      count(issue);
    }

    report.pages.push(entry);
  }

  // 弹层行为走查只在 light 主题做一次（主题无关）
  if (theme === "light") {
    await page.goto(BASE + "/law", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(800);

    // 图鉴弹层：焦点入弹窗 → Tab/Shift+Tab 圈禁 → Esc 归还触发元素
    await page.click(".law-gallery-entry");
    await page.waitForSelector(".law-gallery-overlay");
    await page.waitForTimeout(150);
    const gallery = { name: "彩蛋图鉴弹层", checks: {} };
    gallery.checks.focusOnOpen = await page.evaluate(() => !!document.activeElement?.closest(".law-gallery-overlay"));
    let escaped = false;
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      if (!(await page.evaluate(() => !!document.activeElement?.closest(".law-gallery-overlay")))) { escaped = true; break; }
    }
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Shift+Tab");
      if (!(await page.evaluate(() => !!document.activeElement?.closest(".law-gallery-overlay")))) { escaped = true; break; }
    }
    gallery.checks.trapped = !escaped;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    gallery.checks.returnFocus = await page.evaluate(() => document.activeElement?.classList?.contains("law-gallery-entry") === true);
    gallery.checks.scrollUnlock = await page.evaluate(() => getComputedStyle(document.body).overflow !== "hidden");
    report.dialogs.push(gallery);
    count(
      Object.entries(gallery.checks)
        .filter(([, ok]) => !ok)
        .map(([k]) => ({ severity: "error", check: "dialog-" + k, detail: "图鉴弹层 " + k + " 未通过" })),
    );

    // 重读信弹层（EggModal）：先重开图鉴再数已解锁卡片（图鉴关闭时组件卸载，计数恒 0）
    await page.click(".law-gallery-entry");
    await page.waitForSelector(".law-gallery-overlay");
    const cardCount = await page.locator(".law-gallery__egg.is-unlocked").count();
    if (cardCount > 0) {
      await page.locator(".law-gallery__egg.is-unlocked").first().click();
      await page.waitForSelector(".law-egg-overlay");
      await page.waitForTimeout(150);
      const letter = { name: "彩蛋信纸弹层", checks: {} };
      letter.checks.focusOnOpen = await page.evaluate(() => !!document.activeElement?.closest(".law-egg-overlay"));
      let modalEscaped = false;
      for (let i = 0; i < 10; i += 1) {
        await page.keyboard.press("Tab");
        if (!(await page.evaluate(() => !!document.activeElement?.closest(".law-egg-overlay")))) { modalEscaped = true; break; }
      }
      letter.checks.trapped = !modalEscaped;
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      letter.checks.backToGallery = await page.evaluate(() => !!document.activeElement?.closest(".law-gallery-overlay") || document.activeElement?.classList?.contains("law-gallery-entry") === true);
      report.dialogs.push(letter);
      count(
        Object.entries(letter.checks)
          .filter(([, ok]) => !ok)
          .map(([k]) => ({ severity: "error", check: "dialog-" + k, detail: "信纸弹层 " + k + " 未通过" })),
      );
      await page.keyboard.press("Escape").catch(() => {});
    }

    // 搜索 combobox：activedescendant 引用必须落到真实 option
    await page.goto(BASE + "/law/xingfa", { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(800);
    const search = page.locator('input[role="combobox"]');
    if ((await search.count()) > 0) {
      await search.fill("正当防卫");
      await page.waitForTimeout(700);
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(150);
      const ok = await page.evaluate(() => {
        const input = document.querySelector('input[role="combobox"]');
        const desc = input?.getAttribute("aria-activedescendant");
        if (!desc) return { ok: true, note: "未启用 activedescendant（键盘游标未动）" };
        const opt = document.getElementById(desc);
        return { ok: opt?.getAttribute("role") === "option", note: desc };
      });
      report.dialogs.push({ name: "搜索 combobox", checks: { activedescendant: ok.ok } });
      count(ok.ok ? [] : [{ severity: "error", check: "combobox", detail: "搜索 aria-activedescendant 引用无效: " + ok.note }]);
    }
  }

  await ctx.close();
}

// 对比度：复用渐变感知的 law:contrast（其违规数>0 时退出码非零）
console.log("\n=== 对比度（law:contrast 子进程）===");
const contrast = spawnSync(process.execPath, ["scripts/law-contrast-check.mjs", BASE], { stdio: "inherit" });
report.contrastExitCode = contrast.status;
if (contrast.status !== 0) {
  count([{ severity: "error", check: "contrast", detail: "law:contrast 报告违规（退出码 " + contrast.status + "）" }]);
}

await browser.close();
mkdirSync(".tmp/a11y", { recursive: true });
writeFileSync(".tmp/a11y/report.json", JSON.stringify(report, null, 1));
console.log("\n=== law:a11y 汇总 ===");
console.log("errors:", report.summary.errors, "warnings:", report.summary.warnings, "contrastExit:", report.contrastExitCode);
console.log("报告: .tmp/a11y/report.json");
process.exit(report.summary.errors > 0 ? 1 : 0);
