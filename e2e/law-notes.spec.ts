import { expect, test } from "@playwright/test";

// 法考学习笔记（P3）：课时内面板 → 总览页 → 导出/导入 全链路
test.describe("law notes", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // 只在本测试的第一次文档加载时清库：后续 goto 是真实用户路径，
      // 不能再 clear（否则跨页流程里刚写的笔记会被自己清掉）
      if (sessionStorage.getItem("__law-notes-e2e-ready")) return;
      sessionStorage.setItem("__law-notes-e2e-ready", "1");
      localStorage.clear();
      // 预解锁全部彩蛋，避免时段型彩蛋弹窗挡住交互（与 law-academy.spec 同款）
      const triggers = [
        "midnight", "morning", "firstLesson", "hundred", "streak3", "streak7",
        "wrongbook3", "wrongGraduate", "pathHalf", "bookDone",
        "graphicFirst", "exam30", "christmas", "symbol",
      ];
      const unlocked = Object.fromEntries(triggers.map((t) => [t, true]));
      localStorage.setItem("nhb-law-egg-v1", JSON.stringify({ unlocked, seenAt: { morning: 1 } }));
    });
  });

  /** 走完 falixue-q052 的两步互动到总结页（定义解锁 → 列举点完 → 完成本课） */
  async function walkToSummary(page: import("@playwright/test").Page) {
    await page.goto("/law/learn/falixue-q052");
    await expect(page.locator(".law-player")).toBeVisible();
    await page.locator(".law-definition__lock").first().click({ force: true });
    await page.locator(".law-player__nav.is-primary").click();
    for (let i = 0; i < 10; i += 1) {
      const item = page.locator(".law-list__item:not([disabled])").first();
      if (!(await item.isVisible().catch(() => false))) break;
      await item.click({ force: true });
    }
    await page.locator(".law-player__nav.is-primary").click();
    await expect(page.locator(".law-player__summary")).toBeVisible({ timeout: 10_000 });
  }

  /** 已全部完成的课：连点"下一步"直达总结页（勾选状态已持久化；中途都在 steps 阶段，没有可断言的锚点） */
  async function revisitSummary(page: import("@playwright/test").Page) {
    await page.goto("/law/learn/falixue-q052");
    await expect(page.locator(".law-player")).toBeVisible();
    const primary = page.locator(".law-player__nav.is-primary");
    for (let i = 0; i < 15; i += 1) {
      if (await page.locator(".law-notes").isVisible().catch(() => false)) return;
      await primary.click();
      await page.waitForTimeout(120);
    }
    await expect(page.locator(".law-notes")).toBeVisible({ timeout: 5_000 });
  }

  test("课时内添加 → 编辑 → 总结页可见（写入 localStorage）", async ({ page }) => {
    await walkToSummary(page);

    const panel = page.locator(".law-notes");
    await expect(panel).toBeVisible();
    await expect(panel.getByText("这门课还没有笔记，写下你的理解吧。")).toBeVisible();

    // 添加：输入 + 保存按钮（防抖 500ms 也会自动保存，这里点按钮确定性落盘）
    const draft = page.locator("#law-notes-draft");
    await draft.fill("易混点：主物权与从物权，区分所有权的弹性和追及力");
    await panel.getByRole("button", { name: "保存笔记" }).click();
    await expect(panel.locator(".law-notes__list").getByText("易混点：主物权与从物权，区分所有权的弹性和追及力")).toBeVisible();
    // 空态消失、计数更新
    await expect(panel.getByText("这门课还没有笔记")).toHaveCount(0);

    // 编辑：进入编辑态改文本
    await panel.getByRole("button", { name: "编辑" }).click();
    const editArea = panel.getByLabel("编辑笔记");
    await editArea.fill("易混点：主物权与从物权（编辑后的版本）");
    await panel.getByRole("button", { name: "保存", exact: true }).click();
    await expect(panel.locator(".law-notes__list").getByText("易混点：主物权与从物权（编辑后的版本）")).toBeVisible();

    // 落盘验证（测试注入的数据在 beforeEach 已清理，此处是应用自身的写入）
    const stored = await page.evaluate(() => localStorage.getItem("nhb-law-notes-v1") ?? "");
    expect(stored).toContain("编辑后的版本");
    expect(JSON.parse(stored)["falixue-q052"]).toBeTruthy();
  });

  test("防抖自动保存：输入停顿 500ms 后自动落盘（无需点按钮）", async ({ page }) => {
    await walkToSummary(page);
    const panel = page.locator(".law-notes");
    await page.locator("#law-notes-draft").fill("自动保存的笔记");
    // 不点按钮：等防抖落盘后的"已保存 ✓"闪标（草稿 textarea 里的文本会让
    // getByText 提前命中，不能当保存信号）
    await expect(panel.getByText("已保存 ✓")).toBeVisible({ timeout: 5_000 });
    const stored = await page.evaluate(() => localStorage.getItem("nhb-law-notes-v1") ?? "");
    expect(stored).toContain("自动保存的笔记");
  });

  test("总览页：搜索命中高亮 → 跳转课时 → 删除 → 空态", async ({ page }) => {
    // 第一段：写一条笔记
    await walkToSummary(page);
    const panel = page.locator(".law-notes");
    await page.locator("#law-notes-draft").fill("总览检索 target 关键词：善意取得的构成要件");
    await panel.getByRole("button", { name: "保存笔记" }).click();
    await expect(panel.locator(".law-notes__list").getByText("善意取得的构成要件")).toBeVisible();

    // 第二段：总览页搜索（防抖 300ms 后出结果）
    await page.goto("/law/notes");
    await expect(page.locator(".law-notes-page")).toBeVisible();
    const search = page.locator(".law-notes-page__search");
    await search.fill("善意取得");
    await expect(page.locator(".law-notes-page__result-info")).toContainText("命中 1 条", { timeout: 5_000 });
    await expect(page.locator(".law-notes-page__note mark")).toHaveText("善意取得");

    // 点击笔记 → 跳回课时
    await page.locator(".law-notes-page__note").first().click();
    await expect(page).toHaveURL(/\/law\/learn\/falixue-q052/);

    // 第三段：回到总结页删除笔记（两步确认）
    await revisitSummary(page);
    const panel2 = page.locator(".law-notes");
    await panel2.getByRole("button", { name: "删除" }).click();
    await expect(panel2.getByText("确认删除？删了就找不回来了")).toBeVisible();
    await panel2.getByRole("button", { name: "确认删除" }).click();
    // 删完回到空态
    await expect(panel2.getByText("这门课还没有笔记，写下你的理解吧。")).toBeVisible();

    // 总览页随之空态
    await page.goto("/law/notes");
    await expect(page.getByText("还没有笔记")).toBeVisible();
    await expect(page.getByText("去写第一篇笔记 →")).toBeVisible();
  });

  test("总览页导出：下载 JSON 文件", async ({ page }) => {
    await walkToSummary(page);
    const panel = page.locator(".law-notes");
    await page.locator("#law-notes-draft").fill("要被导出的笔记");
    await panel.getByRole("button", { name: "保存笔记" }).click();
    await expect(panel.locator(".law-notes__list").getByText("要被导出的笔记")).toBeVisible();

    await page.goto("/law/notes");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "⬇️ 导出 JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^law-notes-\d{4}-\d{2}-\d{2}\.json$/);
  });

  test("总览页导入：JSON 文件恢复笔记", async ({ page }) => {
    await page.goto("/law/notes");
    await expect(page.locator(".law-notes-page")).toBeVisible();
    const payload = {
      version: 1,
      exportedAt: Date.now(),
      notes: {
        "minfa-q001": {
          notes: [{ id: "import-e2e", text: "导入恢复的民法笔记", createdAt: 1_000, updatedAt: 1_000 }],
          bookmarks: [],
        },
      },
    };
    await page.setInputFiles(".law-notes-page__file", {
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(payload), "utf8"),
    });
    await expect(page.getByText("导入完成：1 条笔记已恢复。")).toBeVisible();
    await expect(page.locator(".law-notes-page__note").first()).toContainText("导入恢复的民法笔记");
  });

  test("学习中心有笔记入口卡片", async ({ page }) => {
    await page.goto("/law");
    await expect(page.getByRole("link", { name: "📝 我的笔记" })).toBeVisible();
  });
});
