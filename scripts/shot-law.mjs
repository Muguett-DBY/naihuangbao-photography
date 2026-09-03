// 截图验证脚本：打开指定 URL 并截图（Playwright）
// 用法: node scripts/shot-law.mjs <url> <outfile> [width] [height] [waitMs] [actionsJson]
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const [, , url, outfile, width = "1440", height = "900", waitMs = "2200", actionsJson] =
  process.argv;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(width), height: Number(height) },
  deviceScaleFactor: 1.5,
});
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});

await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch((e) => errors.push(`goto: ${e.message}`));
await page.waitForTimeout(Number(waitMs));

if (actionsJson) {
  const actions = JSON.parse(actionsJson);
  for (const action of actions) {
    if (action.click) {
      const locator = page.locator(action.click).first();
      if (await locator.isVisible().catch(() => false)) {
        await locator.click({ force: true });
      } else {
        errors.push(`missing element: ${action.click}`);
      }
    }
    if (action.hover) {
      const locator = page.locator(action.hover).first();
      if (await locator.isVisible().catch(() => false)) await locator.hover().catch((e) => errors.push(e.message));
    }
    if (action.wait) await page.waitForTimeout(action.wait);
    if (action.screenshot) writeFileSync(action.screenshot, await page.screenshot(), "utf8");
    if (action.eval) {
      try {
        const result = await page.evaluate(action.eval);
        console.log("EVAL:", JSON.stringify(result));
      } catch (e) {
        errors.push(`eval: ${e.message}`);
      }
    }
  }
}

writeFileSync(outfile, await page.screenshot());
console.log(`SAVED ${outfile}`);
if (errors.length) {
  console.log("ERRORS:\n" + errors.join("\n"));
  process.exitCode = 2;
} else {
  console.log("NO ERRORS");
}
await browser.close();
