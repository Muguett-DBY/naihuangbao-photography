// 线上验证：打开生产域名 /law 检查渲染与 console 错误
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const url = process.argv[2] ?? "https://shoot.custard.top/law";
const out = process.argv[3] ?? ".tmp/shots/live-law.png";
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1.5 });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 300)}`);
});
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url().slice(0, 140)}`);
});
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => errors.push(`goto: ${e.message}`));
await page.waitForTimeout(3000);
writeFileSync(out, await page.screenshot());
console.log("SAVED", out);
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO ERRORS");
await browser.close();
process.exit(errors.length ? 2 : 0);
