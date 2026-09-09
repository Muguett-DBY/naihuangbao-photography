import { expect, test } from "@playwright/test";

// P4 · 法条检索与知识点关联（/law/provisions）：渲染/搜索/展开/跳转/深链/原文标引
test.describe("law provisions", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test("法条页渲染：统计头部 + 法律分组 + 条目行", async ({ page }) => {
    await page.goto("/law/provisions");
    await expect(page.locator(".law-provisions__head h1")).toContainText("法条检索");
    // 索引懒加载完成后：三张统计卡（总法条/法律数/引用数）+ 分组列表
    await expect(page.locator(".law-provisions__kpi")).toHaveCount(3);
    await expect(page.locator(".law-provisions__kpi").first()).toContainText("法条条目");
    const groups = page.locator(".law-provisions__group");
    await expect(groups.first()).toBeVisible();
    // 分组按条目数降序：引用最多的刑法排最前
    await expect(groups.first().locator(".law-provisions__group-head")).toContainText("刑法");
    await expect(page.locator(".law-provisions__row").first()).toBeVisible();
    // 统计口径行：n 部法律 · n 个条目
    await expect(page.locator(".law-provisions__count")).toContainText(/部法律 · \d+ 个条目/);
  });

  test("搜索过滤：按法律名", async ({ page }) => {
    await page.goto("/law/provisions");
    const input = page.locator('input[aria-label="按法律名或条号搜索"]');
    await expect(input).toBeVisible();
    await input.fill("民法典");
    const heads = page.locator(".law-provisions__group-head");
    await expect(heads.first()).toContainText("民法典");
    // 民法典家族（民法典/总则编解释/侵权责任编）都在，刑法组被过滤掉
    await expect(page.locator(".law-provisions__group-head", { hasText: "刑法" })).toHaveCount(0);
  });

  test("搜索过滤：按条号 + 无结果空态", async ({ page }) => {
    await page.goto("/law/provisions");
    const input = page.locator('input[aria-label="按法律名或条号搜索"]');
    await input.fill("第11条");
    await expect(page.locator(".law-provisions__row-btn", { hasText: "第11条" }).first()).toBeVisible();
    await expect(page.locator(".law-provisions__group-head", { hasText: "刑法" })).toHaveCount(0);

    await input.fill("zzz不存在的法条名");
    await expect(page.locator(".law-provisions__empty")).toContainText("没有找到");
  });

  test("点击展开课时列表并跳转到学习页", async ({ page }) => {
    await page.goto("/law/provisions");
    // 刑法第69条：5 个课时引用，索引里引用次数最高的条目之一
    const row = page.locator(".law-provisions__row", { hasText: "第69条" }).first();
    await expect(row).toBeVisible();
    const btn = row.locator(".law-provisions__row-btn");
    await expect(btn).toHaveAttribute("aria-expanded", "false");
    await btn.click();
    await expect(btn).toHaveAttribute("aria-expanded", "true");
    const lessons = row.locator(".law-provisions__lessons a");
    await expect(lessons.first()).toBeVisible();

    let reloaded = false;
    page.on("load", () => {
      reloaded = true;
    });
    await lessons.first().click();
    await expect(page).toHaveURL(/\/law\/learn\//);
    expect(reloaded, "课时跳转应为 SPA 导航").toBe(false);
  });

  test("深链定位：?law=&article= 自动展开并高亮目标条", async ({ page }) => {
    await page.goto("/law/provisions?law=立法法&article=11");
    const target = page.locator(".law-provisions__row.is-target", { hasText: "第11条" });
    await expect(target).toBeVisible();
    await expect(target.locator(".law-provisions__row-btn")).toHaveAttribute("aria-expanded", "true");
    await expect(target.locator(".law-provisions__lessons a").first()).toBeVisible();
    // 搜索框被预填为法名 + 条号
    await expect(page.locator('input[aria-label="按法律名或条号搜索"]')).toHaveValue(/立法法/);
  });

  test("原文对照面板：法条自动高亮，点击跳到法条检索页（T3）", async ({ page }) => {
    // 预解锁彩蛋，避免时段型弹窗挡住播放器交互（惯例同 law-academy.spec）
    await page.addInitScript(() => {
      const triggers = [
        "midnight", "morning", "firstLesson", "hundred", "streak3", "streak7",
        "wrongbook3", "wrongGraduate", "pathHalf", "bookDone",
        "graphicFirst", "exam30", "christmas", "symbol",
      ];
      localStorage.setItem(
        "nhb-law-egg-v1",
        JSON.stringify({ unlocked: Object.fromEntries(triggers.map((t) => [t, true])), seenAt: { morning: 1 } }),
      );
    });
    await page.goto("/law/learn/xianfa-q007");
    await page.locator(".law-player__raw").click();
    const ref = page.locator(".law-player__rawpanel .law-prov-ref", { hasText: "《立法法》第11条" }).first();
    await expect(ref).toBeVisible();
    await ref.click();
    await expect(page).toHaveURL(/\/law\/provisions\?law=/);
    await expect(page.locator(".law-provisions__row.is-target", { hasText: "第11条" })).toBeVisible();
  });

  test("390px 移动端：页面可用、条目行纵排不溢出", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/law/provisions");
    await expect(page.locator(".law-provisions__head h1")).toBeVisible();
    await expect(page.locator(".law-provisions__row").first()).toBeVisible();
    // 无横向溢出
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
