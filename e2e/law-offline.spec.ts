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

async function goOffline(context: import("@playwright/test").BrowserContext, baseURL: string) {
  await context.setOffline(true);
  // setOffline 的页面级模拟历史上覆盖不到 SW 发起的请求；
  // 路由中止作用于网络层，SW 缓存命中根本不出网 → 不受影响，未命中则被掐断
  const origin = new URL(baseURL).origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await context.route(new RegExp(`^${origin}/`), (route) => route.abort());
}

test.describe("law offline learning", () => {
  test("学习中心 + 学科目录 + 已学过的课离线完整可用", async ({ page, context, baseURL }) => {
    test.setTimeout(120_000);

    await waitForServiceWorker(page);

    // 学科目录：loadLawBook 并行拉全部分块 → 运行时缓存整本
    await page.goto(CACHED_SUBJECT);
    await expect(page.locator(".law-subject__hero h1")).toContainText("民法");

    // 打开一课：meta + 本课分块进缓存
    await page.goto(CACHED_LESSON);
    await expect(page.locator(".law-player")).toBeVisible();

    await goOffline(context, baseURL!);

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

test.describe("law offline coverage（S6·T3 扩展）", () => {
  const EGG_TRIGGERS = [
    "midnight", "morning", "firstLesson", "hundred", "streak3", "streak7",
    "wrongbook3", "wrongGraduate", "pathHalf", "bookDone",
    "graphicFirst", "exam30", "christmas", "symbol",
  ];

  /** 预解锁彩蛋（挡住时段型弹窗）+ 注入一道错题（错题本离线场景的数据前提） */
  async function seedProgress(page: import("@playwright/test").Page) {
    await page.addInitScript((triggers) => {
      const unlocked = Object.fromEntries(triggers.map((t) => [t, true]));
      localStorage.setItem("nhb-law-egg-v1", JSON.stringify({ unlocked, seenAt: { morning: 1 } }));
      const now = Date.now();
      // 民法一课答错（错题本建档：明天到期）；另一课已掌握（统计页有内容可渲染）
      localStorage.setItem(
        "nhb-law-academy-v1",
        JSON.stringify({
          version: 1,
          lastLessonId: "minfa-q031",
          lessons: {
            "minfa-q031": {
              stepsDone: { s0: true, s1: true },
              quizBest: 0,
              quizTotal: 4,
              wrongCount: 1,
              lastVisitedAt: now,
              wrongAt: now,
              reviewStage: 0,
              reviewDueAt: now + 86_400_000,
            },
            "minfa-q032": {
              stepsDone: { s0: true, s1: true, s2: true },
              quizBest: 4,
              quizTotal: 4,
              wrongCount: 0,
              lastVisitedAt: now,
              completedAt: now,
            },
          },
        }),
      );
    }, EGG_TRIGGERS);
  }

  async function cleanup(page: import("@playwright/test").Page, context: import("@playwright/test").BrowserContext, baseURL: string) {
    await context.setOffline(false).catch(() => undefined);
    await context.unrouteAll({ behavior: "ignoreErrors" }).catch(() => undefined);
    await page.evaluate(() => localStorage.clear()).catch(() => undefined);
    void baseURL;
  }

  test("错题本离线可用（loadLawDirectory 的学科 meta 走运行时缓存）", async ({ page, context, baseURL }) => {
    test.setTimeout(120_000);

    await waitForServiceWorker(page);
    await seedProgress(page);

    // 在线：错题本加载 5 科 meta → 进运行时缓存
    await page.goto("/law/wrongbook");
    await expect(page.locator(".law-wrongbook__head h1")).toContainText("错题本");
    await expect(page.locator(".law-wrongbook__item").first()).toBeVisible();
    // 目录已加载：条目显示课名（directory 命中）而非课时 id 兜底
    await expect(page.locator(".law-wrongbook__item b").first()).not.toContainText("minfa-q");

    await goOffline(context, baseURL!);

    // 离线重进：页头/摘要/错题条目完整
    await page.goto("/law/wrongbook");
    await expect(page.locator(".law-wrongbook__head h1")).toContainText("错题本");
    await expect(page.locator(".law-wrongbook__summary")).toBeVisible();
    await expect(page.locator(".law-wrongbook__item").first()).toBeVisible();

    await cleanup(page, context, baseURL!);
  });

  test("统计页离线可用（本地数据 + 应用壳，无网络依赖）", async ({ page, context, baseURL }) => {
    test.setTimeout(120_000);

    await waitForServiceWorker(page);
    await seedProgress(page);

    // 在线：统计页随应用壳进缓存
    await page.goto("/law/stats");
    await expect(page.locator(".law-stats__head h1")).toContainText("学习统计");
    await expect(page.locator(".law-stats__cards")).toBeVisible();

    await goOffline(context, baseURL!);

    // 离线重进：KPI 与柱状图完整渲染（数据在 localStorage，逐日历史/旧口径都在本地）
    await page.goto("/law/stats");
    await expect(page.locator(".law-stats__head h1")).toContainText("学习统计");
    await expect(page.locator(".law-stats__cards")).toBeVisible();
    await expect(page.locator(".law-stats__chart svg")).toBeVisible();

    await cleanup(page, context, baseURL!);
  });

  test("断网下跨页导航不白屏（SPA 内切换已缓存页面）", async ({ page, context, baseURL }) => {
    test.setTimeout(120_000);

    await waitForServiceWorker(page);
    await seedProgress(page);

    // 在线预热：学科 meta + 课程分块 + 错题本/统计页应用壳
    await page.goto(CACHED_SUBJECT);
    await expect(page.locator(".law-subject__hero h1")).toContainText("民法");
    await page.goto(CACHED_LESSON);
    await expect(page.locator(".law-player")).toBeVisible();
    await page.goto("/law/wrongbook");
    await expect(page.locator(".law-wrongbook__head h1")).toBeVisible();
    await page.goto("/law/stats");
    await expect(page.locator(".law-stats__head h1")).toBeVisible();

    await goOffline(context, baseURL!);

    // 断网跨页导航：课程 → 学科目录 → 学习中心 → 错题本 → 统计页，逐站断言非白屏
    await page.goto(CACHED_LESSON);
    await expect(page.locator(".law-player")).toBeVisible();

    await page.locator(".law-player__back").click(); // SPA 返回学科目录
    await expect(page.locator(".law-subject__hero h1")).toContainText("民法");

    // 返回链接被粘性页头视觉遮挡时，事件派发仍走 react-router 的 SPA 导航
    await page.locator(".law-subject__back").dispatchEvent("click"); // 返回学习中心
    await expect(page.locator(".law-academy__hero h1")).toBeVisible();

    await page.locator(".law-academy__quick-link", { hasText: "错题本" }).first().click();
    await expect(page.locator(".law-wrongbook__head h1")).toContainText("错题本");

    // 整页冷导航到统计页（断网 + SW 接管）也不白屏
    await page.goto("/law/stats");
    await expect(page.locator(".law-stats__cards")).toBeVisible();

    const bodyText = await page.evaluate(() => document.body.innerText.trim().length);
    expect(bodyText).toBeGreaterThan(20);

    await cleanup(page, context, baseURL!);
  });
});
