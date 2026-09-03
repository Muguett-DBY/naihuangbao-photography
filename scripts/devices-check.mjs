// 三断点（PC/平板/手机）× 核心页面走查：截图 + 溢出检测
import { chromium } from "@playwright/test";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";

const VIEWPORTS = [
  { name: "pc", width: 1440, height: 900 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "phone", width: 390, height: 844 },
];
const PAGES = [
  { name: "academy", url: "/law", scroll: null },
  { name: "subject", url: "/law/xingfa", scroll: ".law-subject__chapters" },
  { name: "lesson", url: "/law/learn/xingfa-q047", scroll: null },
  { name: "graphic", url: "/law/graphic/xingfa-q083", scroll: null },
];

mkdirSync(".tmp/shots/devices", { recursive: true });
const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.name === "phone" ? 2 : 1.5,
    isMobile: vp.name === "phone",
    hasTouch: vp.name === "phone",
  });
  for (const pg of PAGES) {
    await page.goto(`http://localhost:5173${pg.url}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2600);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    if (overflow > 2) {
      const offenders = await page.evaluate(() => {
        const list = [];
        document.querySelectorAll("body *").forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.right > document.documentElement.clientWidth + 2 && rect.width > 30) {
            list.push(`${el.tagName}.${(el.className || "").toString().slice(0, 40)}`);
          }
        });
        return list.slice(0, 6);
      });
      console.log(`[${vp.name}] ${pg.name} OVERFLOW ${overflow}px ->`, offenders.join(" | "));
    } else {
      console.log(`[${vp.name}] ${pg.name} OK`);
    }
    writeFileSync(`.tmp/shots/devices/${vp.name}-${pg.name}.png`, await page.screenshot());
  }
  await page.close();
}
await browser.close();
console.log("DONE");
