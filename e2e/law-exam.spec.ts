import { expect, test } from "@playwright/test";

// 模拟考试（/law/exam）：配置 → 答题 → 交卷 → 结果 → 再考一次 全流程 + 空池引导态
test.describe("law exam", () => {
  /** 预置四节已完成课（两科），出题池充足且确定性 */
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // 注意：这里只重置 localStorage（进度种子）——sessionStorage 里的考试草稿
      // 必须跨 reload 存活，「答题中途刷新」用例依赖它。
      localStorage.clear();
      const triggers = [
        "midnight", "morning", "firstLesson", "hundred", "streak3", "streak7",
        "wrongbook3", "wrongGraduate", "pathHalf", "bookDone",
        "graphicFirst", "exam30", "christmas", "symbol",
      ];
      const unlocked = Object.fromEntries(triggers.map((t) => [t, true]));
      localStorage.setItem("nhb-law-egg-v1", JSON.stringify({ unlocked, seenAt: { morning: 1 } }));
      const ids = ["falixue-q052", "falixue-q053", "falixue-q073", "minfa-q031"];
      const lessons: Record<string, unknown> = {};
      ids.forEach((id, i) => {
        lessons[id] = {
          stepsDone: { s0: true }, quizBest: 3, quizTotal: 4, wrongCount: 0,
          lastVisitedAt: 1000 - i, completedAt: 1000 - i,
        };
      });
      localStorage.setItem(
        "nhb-law-academy-v1",
        JSON.stringify({ version: 1, lastLessonId: ids[0], lessons }),
      );
    });
  });

  /** 考试模式答一题（不即时判分）：按题型分派最省事的作答 */
  async function answerCurrent(page: import("@playwright/test").Page) {
    const card = page.locator(".law-exam__card");
    const fillInput = card.locator(".law-quiz__fill-input");
    const multiOption = card.locator(".law-quiz__option--multi");
    const chip = card.locator(".law-quiz__order-chip");
    if (await fillInput.isVisible().catch(() => false)) {
      await fillInput.fill("测试作答");
      return "fill";
    }
    if (await multiOption.first().isVisible().catch(() => false)) {
      await multiOption.nth(0).click();
      if ((await multiOption.count()) > 1) await multiOption.nth(1).click();
      return "multi";
    }
    if ((await chip.count()) > 0) {
      // 排序题逐张点（React 受控组件每次点击依赖最新状态，必须一次一张）
      while ((await chip.count()) > 0) await chip.first().click();
      return "order";
    }
    await card.locator(".law-quiz__option").first().click();
    return "choice";
  }

  test("空池（无已完成课）显示引导态而非配置面板", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("nhb-law-academy-v1", JSON.stringify({ version: 1, lessons: {} }));
    });
    await page.goto("/law/exam");
    await expect(page.locator(".law-exam__empty")).toBeVisible();
    await expect(page.locator(".law-exam__empty")).toContainText("还没有可以出题的课");
    await expect(page.locator(".law-exam__empty-cta")).toHaveAttribute("href", "/law");
    await expect(page.locator(".law-exam__panel")).toHaveCount(0);
  });

  test("学习中心图解精选区后有「模拟考试」入口卡", async ({ page }) => {
    await page.goto("/law");
    const entry = page.locator(".law-exam-entry");
    await expect(entry).toBeVisible();
    await expect(entry).toHaveAttribute("href", "/law/exam");
    await expect(entry).toContainText("模拟考试");
  });

  test("全流程：配置→答题→交卷→结果页→再考一次，成绩落盘", async ({ page }) => {
    await page.goto("/law/exam");
    const panel = page.locator(".law-exam__panel");
    await expect(panel).toBeVisible();
    // 五科 checkbox：已完成的可选，其余禁用
    const checkboxes = page.locator(".law-exam__subject input[type=checkbox]");
    await expect(checkboxes).toHaveCount(5);
    await expect(page.locator(".law-exam__subject.is-disabled input[disabled]")).toHaveCount(3);
    // 题量滑块调到 5（快）
    await page.locator(".law-exam__count input[type=range]").fill("5");
    await expect(page.locator(".law-exam__count b")).toContainText("5 题");

    await page.locator(".law-exam__start").click();
    const running = page.locator(".law-exam__running");
    await expect(running).toBeVisible({ timeout: 15_000 });
    // 倒计时出现（5 题 × 45 秒 = 3:45 起）
    await expect(page.locator(".law-exam__clock")).toContainText(/⏳/);
    // 题号面板 5 枚
    await expect(page.locator(".law-exam__dot")).toHaveCount(5);

    // 逐题作答（考试模式：选择即记录，无即时对错反馈）
    for (let q = 0; q < 5; q += 1) {
      await answerCurrent(page);
      const state = page.locator(".law-exam__nav-state");
      await expect(state).toContainText(`已答 ${q + 1} / 5`);
      if (q < 4) await page.locator(".law-exam__nav-btn", { hasText: "下一题" }).click();
    }

    // 交卷 → 结果页
    await page.locator(".law-exam__submit").click();
    const result = page.locator(".law-exam__result");
    await expect(result).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".law-exam__score-num")).toContainText("/ 5");
    await expect(page.locator(".law-exam__by-subject")).toBeVisible();
    // 成绩落盘（nhb-law-exam-v1，一条记录）
    const stored = await page.evaluate(() => localStorage.getItem("nhb-law-exam-v1"));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored as string) as { records: Array<{ total: number }> };
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0].total).toBe(5);
    // 草稿已清
    expect(await page.evaluate(() => sessionStorage.getItem("nhb-law-exam-draft-v1"))).toBeNull();

    // 再考一次 → 回配置面板（科目勾选保留）
    await page.locator(".law-exam__again").click();
    await expect(panel).toBeVisible();
  });

  test("答题中途刷新：作答、题号与倒计时不丢（sessionStorage 草稿恢复）", async ({ page }) => {
    await page.goto("/law/exam");
    await page.locator(".law-exam__start").click();
    await expect(page.locator(".law-exam__running")).toBeVisible({ timeout: 15_000 });
    await answerCurrent(page);
    await expect(page.locator(".law-exam__nav-state")).toContainText("已答 1 /");
    const clockBefore = await page.locator(".law-exam__clock").innerText();

    await page.reload();
    await expect(page.locator(".law-exam__running")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".law-exam__nav-state")).toContainText("已答 1 /");
    // 倒计时继续（deadline 恢复后时钟在同一秒内可能显示相同值，轮询等它走动）
    const clockAtRestore = await page.locator(".law-exam__clock").innerText();
    await expect
      .poll(async () => page.locator(".law-exam__clock").innerText(), { timeout: 10_000 })
      .not.toBe(clockAtRestore);
    // 题卡仍在
    await expect(page.locator(".law-exam__card")).toBeVisible();
  });

  test("390px 移动端可完成配置并进入考试", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/law/exam");
    await expect(page.locator(".law-exam__panel")).toBeVisible();
    await page.locator(".law-exam__start").click();
    await expect(page.locator(".law-exam__running")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".law-exam__card")).toBeVisible();
  });
});
