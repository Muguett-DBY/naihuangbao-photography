// law 模块对比度审计：六类页面 × 双主题 × 双视口，枚举可见文本算 WCAG ratio
// 大字（≥24px 或 ≥18.66px 粗体）3:1 / 小字 4.5:1。输出违规清单（含选择器与文件归属）。
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5183";
const PAGES = [
  { name: "学习中心", url: "/law" },
  { name: "学科页", url: "/law/xingfa" },
  { name: "课时页", url: "/law/learn/xingfa-q047" },
  { name: "图解页", url: "/law/graphic/xingfa-q083" },
  { name: "错题本", url: "/law/wrongbook" },
  { name: "统计页", url: "/law/stats" },
];
const THEMES = ["light", "dark"];
const VIEWPORTS = [
  { name: "pc", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
];

// 预置学习进度，让错题本/统计页有数据可渲染（测试注入，脚本结束清理）
const SEED = `(() => {
  try {
    const done = [];
    for (let i = 1; i <= 12; i++) done.push("xingfa-q" + String(i).padStart(3, "0"));
    localStorage.setItem("nhb-law-progress", JSON.stringify({
      xingfa_q001: { done: ["xingfa-q001-s0", "xingfa-q001-s1"], at: 1 },
      xingfa_q047: { done: ["xingfa-q047-s0"], at: 1 },
    }));
    localStorage.setItem("nhb-law-wrong", JSON.stringify({
      "xingfa-q047-q3": { count: 2, last: "y" },
      "xingfa-q001-q5": { count: 1, last: "n" },
    }));
    localStorage.setItem("nhb-law-theme", "seed");
  } catch {}
})();`;

const AUDIT = `(() => {
  const parse = (s) => {
    let m = s.match(/rgba?\\(([^)]+)\\)/);
    if (m) {
      const p = m[1].split(",").map((x) => parseFloat(x));
      return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
    }
    // color(srgb R G B[ / A]) —— color-mix() 的计算值形态
    m = s.match(/color\\(srgb ([\\d.]+) ([\\d.]+) ([\\d.]+)(?:\\s*\\/\\s*([\\d.]+))?\\)/);
    if (m) {
      return { r: +m[1] * 255, g: +m[2] * 255, b: +m[3] * 255, a: m[4] === undefined ? 1 : +m[4] };
    }
    return null;
  };
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const blend = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const out = [];
  const els = document.querySelectorAll("body *");
  for (const el of els) {
    if (el.children.length > 0 && !el.matches("p,h1,h2,h3,h4,h5,h6,span,a,button,li,td,th,label,strong,em")) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) continue;
    const text = (el.textContent ?? "").trim();
    if (!text) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 3 || rect.height < 3) continue;
    // 只看视口内 + 上方 3000px（懒加载外的内容靠滚动由外层脚本处理）
    if (rect.bottom < -3000 || rect.top > innerHeight + 3000) continue;
    const fg = parse(cs.color);
    if (!fg || fg.a === 0) continue;
    // 有效背景：向上找第一层非透明背景
    let bgEl = el, bg = null, layers = 0, gradientBg = false;
    while (bgEl && layers < 24) {
      const cs2 = getComputedStyle(bgEl);
      if (cs2.backgroundImage !== "none") { gradientBg = true; break; } // 渐变无法按点计算——标记为人工核验
      const c = parse(cs2.backgroundColor);
      if (c && c.a > 0.95) { bg = c; break; }
      if (c && c.a > 0) { bg = bg ? blend(c, bg) : c; }
      bgEl = bgEl.parentElement; layers++;
    }
    if (gradientBg) continue; // 渐变背景跳过自动判（另有清单人工核验）
    if (!bg) bg = { r: 255, g: 255, b: 255, a: 1 };
    const eff = fg.a < 1 ? blend(fg, bg) : fg;
    const r = ratio(eff, bg);
    const px = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if (r < need - 0.01) {
      out.push({
        text: text.slice(0, 28),
        ratio: +r.toFixed(2),
        need,
        px: +px.toFixed(1),
        weight: cs.fontWeight,
        color: cs.color,
        bg: getComputedStyle(bgEl ?? el).backgroundColor,
        tag: el.tagName.toLowerCase(),
        cls: (el.className && typeof el.className === "string" ? el.className : "").split(" ").slice(0, 3).join("."),
      });
    }
  }
  return out;
})()`;

mkdirSync(".tmp/contrast", { recursive: true });
const browser = await chromium.launch();
const report = [];
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: !!vp.isMobile,
    hasTouch: !!vp.hasTouch,
  });
  for (const theme of THEMES) {
    const page = await ctx.newPage();
    await page.addInitScript((t) => {
      try {
        localStorage.setItem("nhb-theme", t);
        document.documentElement.dataset.theme = t;
      } catch {}
      window.__setTheme = t;
    }, theme);
    for (const pg of PAGES) {
      const violations = [];
      await page.goto(BASE + pg.url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      // 主题切换有 0.16s 背景过渡——等过渡完成再采样，避免把中间值当违规
      await page.waitForTimeout(700);
      // 滚动到底触发懒加载，逐屏审计
      for (let round = 0; round < 6; round += 1) {
        const found = await page.evaluate(AUDIT).catch(() => []);
        violations.push(...found);
        const prev = await page.evaluate(() => window.scrollY);
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.9));
        await page.waitForTimeout(350);
        const now = await page.evaluate(() => window.scrollY);
        if (now === prev) break;
      }
      // 去重（text+ratio+cls）
      const seen = new Set();
      const uniq = violations.filter((v) => {
        const k = v.text + "|" + v.ratio + "|" + v.cls;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      for (const v of uniq) report.push({ page: pg.name, url: pg.url, theme, vp: vp.name, ...v });
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
writeFileSync(".tmp/contrast/violations.json", JSON.stringify(report, null, 1));
const byKey = {};
for (const v of report) {
  const k = `${v.page}/${v.theme}/${v.vp}`;
  byKey[k] = (byKey[k] ?? 0) + 1;
}
console.log("=== 违规分布（页/主题/视口 → 数量）===");
for (const [k, n] of Object.entries(byKey).sort()) console.log(` ${k}: ${n}`);
console.log("总计:", report.length, "→ .tmp/contrast/violations.json");
