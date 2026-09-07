import { expect, test } from "@playwright/test";

/**
 * 法学模块 PWA 离线学习实测：
 * 在线走一遍真实学习路径（学习中心 → 学科目录整本装配 → 打开一课），
 * 然后"断网"（offline 模拟 + 全站请求中止双保险，缓存命中不会触发网络层）
 * 验证学习中心 / 学科目录 / 已学过的课仍然完整可用；
 * 阴性对照：从未访问过的科目离线必须打不开（证明断网是真的、缓存是真的）。
 */

const CACHED_LESSON = "/law/learn/minfa-q031";
const CACHED_SUBJECT = "/law/minfa";
const UNCACHED_LESSON = "/law/learn/xianfa-q002";

async function waitForServiceWorker(page: import("@playwright/test").Page) {
  await page.goto("/law");
  await expect(page.locator(".law-academy__hero h1")).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  // clientsClaim 关闭：首次安装后本页不受控，reload 一次让 SW 接管
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
}

async function goOffline(context: import("@playwright/test").BrowserContext) {
  await context.setOffline(true);
  // setOffline 的页面级模拟历史上覆盖不到 SW 发起的请求；
  // 路由中止作用于网络层，SW 缓存命中根本不出网 → 不受影响，未命中则被掐断
  await context.route(/^https?:\/\/127\.0\.0\.1:4174\//, (route) => route.abort());
}

test.describe("law offline learning", () => {
  test("学习中心 + 学科目录 + 已学过的课离线完整可用", async ({ page, context }) => {
    test.setTimeout(120_000);

    await waitForServiceWorker(page);

    // 学科目录：loadLawBook 并行拉全部分块 → 运行时缓存整本
    await page.goto(CACHED_SUBJECT);
    await expect(page.locator(".law-subject__hero h1")).toContainText("民法");

    // 打开一课：meta + 本课分块进缓存
    await page.goto(CACHED_LESSON);
    await expect(page.locator(".law-player")).toBeVisible();

    await goOffline(context);

    // ① 学习中心
    await page.goto("/law");
    await expect(page.locator(".law-academy__hero h1")).toBeVisible();
    await expect(page.locator(".law-subject-card").first()).toBeVisible();

    // ② 学科目录（整本装配全部来自运行时缓存）
    await page.goto(CACHED_SUBJECT);
    await expect(page.locator(".law-subject__hero h1")).toContainText("民法");
    await expect(page.locator(".law-path")).toBeVisible();

    // ③ 已学过的课
    await page.goto(CACHED_LESSON);
    await expect(page.locator(".law-player")).toBeVisible();

    // ④ 阴性对照：从未访问的科目离线打不开（骨架后进入错误态而不是假加载）
    await page.goto(UNCACHED_LESSON);
    await expect(page.locator(".law-player")).toHaveCount(0);
    await expect(page.locator(".law-notfound")).toBeVisible();
  });
});
