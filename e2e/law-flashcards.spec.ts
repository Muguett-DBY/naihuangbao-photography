import { expect, test } from "@playwright/test";

// P2 闪卡快刷（/law/flashcards）+ 学习热力图（/law/stats）回归
// 种子课时（真实数据）：falixue-q052（已完成·未自测）、minfa-q031（已完成·自测通过）、
// xingfa-q014（已完成·错题到期，标题卡应排牌堆第一张）
const DUE_LESSON_TITLE = "简述犯罪构成的概念及其内容";

test.describe("law flashcards & heatmap", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      // 预解锁全部彩蛋，避免时段型彩蛋弹窗挡住交互（与 law-academy.spec 同一口径）
      const triggers = [
        "midnight", "morning", "firstLesson", "hundred", "streak3", "streak7",
        "wrongbook3", "wrongGraduate", "pathHalf", "bookDone",
        "graphicFirst", "exam30", "christmas", "symbol",
      ];
      const unlocked = Object.fromEntries(triggers.map((t) => [t, true]));
      localStorage.setItem("nhb-law-egg-v1", JSON.stringify({ unlocked, seenAt: { morning: 1 } }));
    });
  });

  const seedLessons = (page: import("@playwright/test").Page, lessons: Record<string, object>) => {
    return page.addInitScript((seed) => {
      localStorage.setItem("nhb-law-academy-v1", JSON.stringify({ version: 1, lessons: seed, lastLessonId: null }));
    }, lessons);
  };

  const dayAgo = (days: number) => Date.now() - days * 86_400_000;

  test("空状态：无已完成课时显示引导与「去学习」入口", async ({ page }) => {
    await page.goto("/law/flashcards");
    const empty = page.locator(".law-flash__empty");
    await expect(empty).toBeVisible();
    await expect(empty).toContainText("还没有可抽的闪卡");
    await expect(empty.getByRole("link", { name: "去学习 →" })).toHaveAttribute("href", "/law");
  });

  test("闪卡全流程：到期错题课排第一 → 翻面 → 键盘导航 → 评分 → 总结 → 再来一轮", async ({ page }) => {
    seedLessons(page, {
      "xingfa-q014": {
        stepsDone: { s1: true }, quizBest: 1, quizTotal: 4, wrongCount: 1,
        lastVisitedAt: dayAgo(2), completedAt: dayAgo(3),
        wrongAt: dayAgo(2), reviewStage: 0, reviewDueAt: Date.now() - 3_600_000,
      },
      "falixue-q052": {
        stepsDone: { s1: true }, quizBest: 0, quizTotal: 0, wrongCount: 0,
        lastVisitedAt: dayAgo(1), completedAt: dayAgo(1),
      },
      "minfa-q031": {
        stepsDone: { s1: true }, quizBest: 4, quizTotal: 4, wrongCount: 0,
        lastVisitedAt: dayAgo(5), completedAt: dayAgo(5),
      },
    });

    await page.goto("/law/flashcards");
    // 到期口径 = 到期错题课（xingfa-q014）+ 从未复习的完成课（falixue-q052）
    await expect(page.locator(".law-flash__due-hint")).toContainText("2 课");
    await expect(page.locator(".law-flash__check")).toHaveCount(5);

    await page.getByRole("button", { name: /开始复习/ }).click();
    const card = page.locator(".law-flash__card");
    await expect(card).toBeVisible();

    // 到期错题课（xingfa-q014）的课时标题卡排第一
    await expect(card).toHaveAttribute("aria-label", new RegExp(`闪卡正面：${DUE_LESSON_TITLE}`));

    // 点击翻面（aria-pressed 翻转），背面含科目来源
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".law-flash__face--back")).toContainText("刑法");

    // ← → 键切换，空格翻面
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".law-flash__progress")).toContainText("第 2");
    await page.keyboard.press("Space");
    await expect(card).toHaveAttribute("aria-pressed", "true");

    // 「不会」重排：当前卡沉底，仍是同一张卡在队列里
    await page.getByRole("button", { name: "😭 不会" }).click();
    await expect(page.locator(".law-flash__summary")).toHaveCount(0);

    // 连按「会了」直到队列清空出总结页
    const known = page.getByRole("button", { name: "😊 会了" });
    for (let round = 0; round < 30; round += 1) {
      if (await page.locator(".law-flash__summary").isVisible().catch(() => false)) break;
      await known.click();
    }
    const summary = page.locator(".law-flash__summary");
    await expect(summary).toContainText("这一轮刷完了");
    await expect(summary).toContainText("😭 不会");

    // 再来一轮 → 牌堆重置；退出 → 返回选择面板
    await summary.getByRole("button", { name: "再来一轮" }).click();
    await expect(page.locator(".law-flash__card")).toBeVisible();
    await page.getByRole("button", { name: "← 退出" }).click();
    await expect(page.locator(".law-flash__setup")).toBeVisible();
  });

  test("移动端 390px：牌堆完整渲染且操作按钮可达", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    seedLessons(page, {
      "falixue-q052": {
        stepsDone: { s1: true }, quizBest: 0, quizTotal: 0, wrongCount: 0,
        lastVisitedAt: dayAgo(1), completedAt: dayAgo(1),
      },
    });
    await page.goto("/law/flashcards");
    await page.getByRole("button", { name: /开始复习/ }).click();
    await expect(page.locator(".law-flash__card")).toBeVisible();
    for (const name of ["😭 不会", "😐 模糊", "😊 会了"]) {
      await expect(page.getByRole("button", { name })).toBeVisible();
    }
  });

  test("学习中心入口卡片可直达闪卡页", async ({ page }) => {
    await page.goto("/law");
    const entry = page.locator(".law-academy__quick").getByRole("link", { name: "🃏 闪卡快刷" });
    await expect(entry).toBeVisible();
    await entry.click();
    await expect(page).toHaveURL(/\/law\/flashcards$/);
    await expect(page.locator(".law-flash__head h1")).toBeVisible();
  });

  test("学习热力图：365 天渲染、悬停文案、30 天切换", async ({ page }) => {
    seedLessons(page, {
      "minfa-q001": {
        stepsDone: { s1: true }, quizBest: 0, quizTotal: 0, wrongCount: 0,
        lastVisitedAt: Date.now(), completedAt: Date.now() - 3600_000,
      },
      "minfa-q002": {
        stepsDone: { s1: true }, quizBest: 0, quizTotal: 0, wrongCount: 0,
        lastVisitedAt: dayAgo(100), completedAt: dayAgo(100),
      },
      "xingfa-q001": {
        stepsDone: { s1: true }, quizBest: 0, quizTotal: 0, wrongCount: 0,
        lastVisitedAt: dayAgo(100), completedAt: dayAgo(100) + 7200_000,
      },
    });

    await page.goto("/law/stats");
    const svg = page.locator(".law-heat__svg");
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("aria-label", /学习热力图：共完成 3 课时，学习 2 天/);
    await expect(page.locator(".law-heat__summary")).toContainText("近 一年完成 3 课时 · 学习 2 天");

    // 悬停文案：今天的格子显示日期 + 完成数
    const todayCell = page.locator(".law-heat__cell.is-today");
    await expect(todayCell).toHaveCount(1);
    const tooltip = await todayCell.evaluate((el) => el.querySelector("title")?.textContent ?? "");
    expect(tooltip).toMatch(/完成 1 课时/);

    // 切换 30 天：窗口缩小后只剩今天的 1 课时（格数只数 SVG 内格子，不含图例色块）
    await page.getByRole("button", { name: "30 天" }).click();
    await expect(svg).toHaveAttribute("aria-label", /近 30 天学习热力图：共完成 1 课时，学习 1 天/);
    await expect(page.locator(".law-heat__svg .law-heat__cell")).toHaveCount(30);
  });
});
