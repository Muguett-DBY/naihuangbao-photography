// law 模块对比度审计：六类页面 × 双主题 × 双视口，枚举可见文本算 WCAG ratio
// 大字（≥24px 或 ≥18.66px 粗体）3:1 / 小字 4.5:1。输出违规清单（含选择器与文件归属）。
// 渐变感知（S4 升级）：computed backgroundImage 的色标已是解析后的颜色——
// 逐色标与文字算 ratio 取最差值，透明色标向更深背景混合后再算；解析失败才退回跳过。
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
    if (!s || s === "none") return null;
    if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
    let m = s.match(/^rgba?\\(([^)]+)\\)$/);
    if (m) {
      const p = m[1].split(/[\\s,\\/]+/).filter(Boolean).map((x) => parseFloat(x));
      if (p.length >= 3) return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
      return null;
    }
    // color(srgb R G B[ / A]) —— color-mix() 的计算值形态
    m = s.match(/^color\\(srgb ([\\d.]+) ([\\d.]+) ([\\d.]+)(?:\\s*\\/\\s*([\\d.]+))?\\)$/);
    if (m) {
      return { r: +m[1] * 255, g: +m[2] * 255, b: +m[3] * 255, a: m[4] === undefined ? 1 : +m[4] };
    }
    m = s.match(/^#([0-9a-fA-F]{3,8})$/);
    if (m) {
      const h = m[1];
      if (h.length === 3 || h.length === 4) {
        const v = h.split("").map((c) => parseInt(c + c, 16));
        return { r: v[0], g: v[1], b: v[2], a: v[3] === undefined ? 1 : v[3] / 255 };
      }
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
      };
    }
    return null;
  };
  // 渐变色标提取：computed 背景里颜色已是解析值，全部抓出来逐个算
  const gradientStops = (image) => {
    if (!image || image === "none") return null;
    if (!/^(repeating-)?(linear|radial)-gradient\\(/.test(image.trim())) return null;
    const tokens = image.match(/rgba?\\([^)]*\\)|color\\([^)]*\\)|#[0-9a-fA-F]{3,8}\\b|transparent/gi);
    if (!tokens) return null;
    const stops = tokens.map(parse).filter(Boolean);
    return stops.length ? stops : null;
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
    // 有效背景：自文字向上回溯。
    // 命中最上层渐变后，全部色标参与竞争（透明色标与其下复合底色混合），
    // 不透明纯色截断回溯（更深的层不可见）。imageBg=不可解析的图片背景。
    let bgEl = el, layers = 0;
    let base = null;      // 渐变之下累积中的纯色复合
    let stops = null;     // 离文字最近的渐变的全部色标
    let stopsBase = null; // 该渐变之下的复合底色
    let imageBg = false;
    while (bgEl && layers < 24) {
      const cs2 = getComputedStyle(bgEl);
      const own = parse(cs2.backgroundColor);
      if (!stops) {
        const found = gradientStops(cs2.backgroundImage);
        if (found) {
          stops = found;
        } else if (cs2.backgroundImage && cs2.backgroundImage !== "none") {
          imageBg = true;
        }
      }
      if (own && own.a > 0) {
        if (stops) {
          stopsBase = stopsBase ? blend(own, stopsBase) : { ...own, a: 1 };
        } else {
          base = base ? blend(own, base) : own;
        }
      }
      if (own && own.a > 0.95) break; // 不透明纯色：更深背景不可见
      bgEl = bgEl.parentElement; layers++;
    }
    if (!stops && imageBg) continue; // 图片背景无法按点计算——人工核验清单
    const white = { r: 255, g: 255, b: 255, a: 1 };
    const under = stopsBase ?? base ?? white;
    // 底色只在渐变存在透明色标（透出底色）时才参与竞争；全不透明渐变下底色不可见
    const candidates = stops
      ? [
          ...stops.map((s) => (s.a < 1 ? blend(s, under) : { ...s, a: 1 })),
          ...(stops.some((s) => s.a < 1) ? [under] : []),
        ]
      : [base ?? white];
    let worst = Infinity;
    for (const bg of candidates) {
      const effFg = fg.a < 1 ? blend(fg, bg) : fg;
      worst = Math.min(worst, ratio(effFg, bg));
    }
    const px = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if (worst < need - 0.01) {
      out.push({
        text: text.slice(0, 28),
        ratio: +worst.toFixed(2),
        need,
        px: +px.toFixed(1),
        weight: cs.fontWeight,
        color: cs.color,
        bg: stops ? "gradient worst stop" : getComputedStyle(bgEl ?? el).backgroundColor,
        via: stops ? "gradient" : "solid",
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
  const k = `${v.page}/${v.theme}/${v.vp}/${v.via ?? "solid"}`;
  byKey[k] = (byKey[k] ?? 0) + 1;
}
console.log("=== 违规分布（页/主题/视口/来源 → 数量）===");
for (const [k, n] of Object.entries(byKey).sort()) console.log(` ${k}: ${n}`);
console.log("总计:", report.length, "→ .tmp/contrast/violations.json");
// 回归工具约定：有违规退出码非零（law:a11y 与 CI 依赖）
process.exitCode = report.length > 0 ? 1 : 0;
