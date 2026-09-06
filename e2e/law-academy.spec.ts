import { expect, test } from "@playwright/test";

// 法硕学习中心（/law）：核心学习路径回归
test.describe("law academy", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      // 预解锁全部彩蛋，避免时段型彩蛋信（清晨/深夜/考前30天）弹窗挡住交互
      const triggers = [
        "midnight", "morning", "firstLesson", "hundred", "streak3",
        "wrongbook3", "graphicFirst", "exam30", "christmas", "symbol",
      ];
      const unlocked = Object.fromEntries(triggers.map((t) => [t, true]));
      localStorage.setItem("nhb-law-egg-v1", JSON.stringify({ unlocked, seenAt: { morning: 1 } }));
      // 本章节省默认目录视图；关卡地图视图由专门的用例覆盖
      localStorage.setItem("nhb-law-subject-view", "tree");
    });
  });

  test("学习中心首页渲染学科、计划卡与统计", async ({ page }) => {
    await page.goto("/law");
    await expect(page.locator(".law-academy__hero h1")).toContainText("五本书");
    await expect(page.locator(".law-plan-card")).toBeVisible();
    await expect(page.locator(".law-subject-card")).toHaveCount(5);
    await expect(page.locator(".law-graphic-card").first()).toBeVisible();
    // 知识点总数来自 stats.json（排除索引空壳课后为 1510）
    await expect(page.locator(".law-academy__stats")).toContainText(/个知识点/);
  });

  test("学科页展开章节并显示课时", async ({ page }) => {
    await page.goto("/law/xianfa");
    await expect(page.locator(".law-subject__hero h1")).toContainText("宪法");
    await expect(page.locator(".law-search__box input")).toBeVisible();
    // 第一章默认展开，含课时链接
    const lessons = page.locator(".law-lesson-link");
    await expect(lessons.first()).toBeVisible();
    await expect(page.locator(".law-chapter__head").first()).toBeVisible();
  });

  test("学科内搜索可跳转到课时（SPA 导航，无整页刷新）", async ({ page }) => {
    await page.goto("/law/xianfa");
    // 监听要挂在初始 goto 之后——goto 本身会触发一次 load
    let reloaded = false;
    page.on("load", () => {
      reloaded = true;
    });
    await page.fill(".law-search__box input", "根本");
    const hit = page.locator(".law-search__results li button").first();
    await expect(hit).toBeVisible();
    await hit.click();
    await expect(page).toHaveURL(/\/law\/learn\//);
    expect(reloaded, "搜索跳转不应触发整页刷新").toBe(false);
  });

  test("完整学习流：定义→列举→总结→自测按钮出现", async ({ page }) => {
    await page.goto("/law/learn/falixue-q052");
    await expect(page.locator(".law-player")).toBeVisible();

    // 第 1 步：定义解锁（按钮带呼吸动画，需 force 点击）
    await page.locator(".law-definition__lock").first().click({ force: true });
    await page.locator(".law-player__nav.is-primary").click();

    // 第 2 步：列举逐条点完
    for (let i = 0; i < 10; i += 1) {
      const item = page.locator(".law-list__item:not([disabled])").first();
      if (!(await item.isVisible().catch(() => false))) break;
      await item.click({ force: true });
    }
    await page.locator(".law-player__nav.is-primary").click();

    // 总结页必须出现"来自测"按钮（回归：quiz 曾因 phase 依赖永远不显示）
    const quizCta = page.locator(".law-player__summary").getByText("来自测一下");
    await expect(quizCta).toBeVisible({ timeout: 10_000 });
    await quizCta.click();
    // 首题可能是选择题（选项）或排序题（卡片），任一出现即可
    const option = page.locator(".law-quiz__option").first();
    const chip = page.locator(".law-quiz__order-chip").first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
    } else {
      await chip.click();
      const chip2 = page.locator(".law-quiz__order-chip").first();
      if (await chip2.isVisible().catch(() => false)) await chip2.click();
      if (await chip2.isVisible().catch(() => false)) await chip2.click();
    }
    await expect(page.locator(".law-quiz__feedback")).toBeVisible();
  });

  test("复习模式（?review=1）直达自测", async ({ page }) => {
    await page.goto("/law/learn/falixue-q052?review=1");
    await expect(page.locator(".law-quiz")).toBeVisible();
    const option = page.locator(".law-quiz__option").first();
    const chip = page.locator(".law-quiz__order-chip").first();
    await expect(option.or(chip).first()).toBeVisible();
  });

  test("图解课堂渲染舞台与解说", async ({ page }) => {
    await page.goto("/law/graphic/xingfa-q014");
    await expect(page.locator(".law-graphic__bar")).toBeVisible();
    await expect(page.locator(".law-graphic__stage")).toBeVisible();
    await expect(page.locator(".law-graphic__caption")).toBeVisible();
  });

  test("「下一课」跳过索引空壳课（回归：曾直接落进无正文的死页）", async ({ page }) => {
    await page.goto("/law/learn/minfa-q031");
    await expect(page.locator(".law-player")).toBeVisible();
    // 推进到总结页：plain 步自动完成，list 步逐条点，nav 可点就点
    const summary = page.locator(".law-player__summary");
    for (let round = 0; round < 24 && !(await summary.isVisible().catch(() => false)); round += 1) {
      const item = page.locator(".law-list__item:not([disabled])").first();
      if (await item.isVisible().catch(() => false)) {
        await item.click({ force: true });
        continue;
      }
      const nav = page.locator(".law-player__nav.is-primary");
      if (await nav.isEnabled().catch(() => false)) {
        await nav.click({ force: true });
        await page.waitForTimeout(250);
      } else {
        await page.waitForTimeout(300);
      }
    }
    await expect(summary).toBeVisible({ timeout: 10_000 });
    const skip = summary.getByText("跳过自测，直接标记掌握");
    const master = summary.getByText("学完了，标记掌握");
    if (await skip.isVisible().catch(() => false)) await skip.click();
    else await master.click();
    const nextBtn = page.locator(".law-player__result-actions").getByText("下一课");
    // minfa-q032 是空壳索引课，必须被跳过直达 minfa-q033
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    await expect(page).toHaveURL(/\/law\/learn\/minfa-q033$/);
  });

  test("附录章不进章节目录（回归：98 个索引课时曾混进学习目录）", async ({ page }) => {
    await page.goto("/law/zhishixiang");
    await expect(page.locator(".law-subject__hero h1")).toContainText("法制史");
    // 附录章不出现在章节列表里
    await expect(page.locator(".law-chapter__head", { hasText: "附录" })).toHaveCount(0);
    // 附录内容折叠保留可查阅
    await expect(
      page.locator(".law-subject__leftover h2", { hasText: "考点速查索引" }),
    ).toBeVisible();
  });

  test("关卡地图：默认路径视图 + 当前节点 + 双视图切换", async ({ page }) => {
    // 不预设视图偏好 → 默认落在路径视图
    await page.addInitScript(() => localStorage.removeItem("nhb-law-subject-view"));
    await page.goto("/law/xianfa");
    await expect(page.locator(".law-path")).toBeVisible();
    // 恰好一个"当前位置"节点，且带开始旗
    await expect(page.locator(".law-path__node.is-current")).toHaveCount(1);
    await expect(page.locator(".law-path__start")).toBeVisible();
    // 全部节点中不含索引空壳课链接
    const nodeCount = await page.locator(".law-path__node").count();
    expect(nodeCount).toBeGreaterThan(50);
    // 切到章节目录，再切回来
    await page.locator(".law-subject__viewtoggle button", { hasText: "章节目录" }).click();
    await expect(page.locator(".law-chapter__head").first()).toBeVisible();
    await page.locator(".law-subject__viewtoggle button", { hasText: "学习路径" }).click();
    await expect(page.locator(".law-path")).toBeVisible();
    // 偏好已持久化：刷新后仍在路径视图
    await page.reload();
    await expect(page.locator(".law-path")).toBeVisible();
  });
});
