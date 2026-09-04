// 完整流程验证 v2：定义→列表→总结→3道自测→结果
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const url = process.argv[2] ?? "http://localhost:5173/law/learn/minfa-q010";
const outDir = ".tmp/shots/flow2";
const errors = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1.5 });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2600);

const shot = async (name) => {
  writeFileSync(`${outDir}/${name}.png`, await page.screenshot());
  console.log("SHOT", name);
};
const click = async (selector, label) => {
  const locator = page.locator(selector).first();
  const visible = await locator.isVisible().catch(() => false);
  console.log("CLICK", label, visible ? "visible" : `MISSING (${selector})`);
  if (!visible) {
    errors.push(`missing ${label}`);
    return false;
  }
  await locator.click({ force: true });
  await page.waitForTimeout(650);
  return true;
};

// 时段彩蛋信（清晨/深夜等）可能弹窗挡住学习流，先收好
const eggOverlay = page.locator(".law-egg-overlay");
if (await eggOverlay.isVisible().catch(() => false)) {
  await page.locator(".law-egg-card__close").click({ force: true });
  await page.waitForTimeout(400);
  console.log("DISMISSED egg letter");
}

await shot("01-definition");
await click(".law-definition__lock", "解锁关键词");
await shot("02-unlocked");
await click(".law-player__nav.is-primary", "下一步→列表");

// 列表步骤：依次点 4 项
for (let i = 0; i < 6; i += 1) {
  const item = page.locator(".law-list__item:not([disabled])").first();
  if (!(await item.isVisible().catch(() => false))) break;
  await item.click({ force: true });
  await page.waitForTimeout(420);
}
await shot("03-list-done");
await click(".law-player__nav.is-primary", "完成本课→总结");

await shot("04-summary");
await click(".law-player__cta", "开始自测");

for (let q = 0; q < 4; q += 1) {
  const feedback = page.locator(".law-quiz__feedback").first();
  const isDone = page.locator(".law-quiz__done").first();
  if (await isDone.isVisible().catch(() => false)) break;
  const option = page.locator(".law-quiz__option").first();
  if (await option.isVisible().catch(() => false)) {
    await option.click({ force: true });
  } else {
    const chip = page.locator(".law-quiz__order-chip").first();
    if (await chip.isVisible().catch(() => false)) {
      await chip.click({ force: true });
      await chip.click({ force: true });
    }
  }
  await page.waitForTimeout(500);
  await shot(`05-quiz-q${q + 1}`);
  const nextBtn = page.locator(".law-quiz__next").first();
  if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click({ force: true });
  await page.waitForTimeout(450);
}

await shot("06-result");

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO ERRORS");
await browser.close();
process.exit(errors.length ? 2 : 0);
