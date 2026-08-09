import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("lang", "zh-CN");
    localStorage.setItem("nhb-motion-mode", "full");
  });
});

test("@critical V4 信息架构、档案分层与发布清单可用", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/archive");

  await expect(page.locator(".platform-hero h1")).toContainText("影像档案");
  await expect(page.locator('.nav-menu--inline a[href="/gallery"]')).toBeVisible();
  await expect(page.locator('.nav-menu--inline a[href="/booking"]')).toBeVisible();
  await expect(page.locator('.nav-menu--inline a[href="/archive"], .nav-menu--inline a[href="/create"]')).toHaveCount(0);
  await expect(page.locator(".archive-project")).toHaveCount(26);
  await expect(page.locator(".archive-real-item")).toHaveCount(6);
  await expect(page.locator(".archive-constellation")).toBeVisible();
  await expect(page.locator(".archive-concept-section")).toContainText("不是真实客片");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const releaseResponse = await request.get("/release.json");
  expect(releaseResponse.ok()).toBe(true);
  const release = await releaseResponse.json();
  expect(release.commit).toMatch(/^[a-f0-9]{40}$/);
  expect(release.archiveSchemaVersion).toBe(3);
  expect(release.storySchemaVersion).toBe(1);
});

test("@critical 档案筛选只影响概念研究且不混入真实作品", async ({ page }) => {
  await page.goto("/archive");
  await page.getByLabel("情绪").selectOption("雨后");
  await expect(page.locator(".archive-project")).toHaveCount(2);
  await expect(page.locator(".archive-real-item")).toHaveCount(6);
  await page.getByRole("button", { name: "重置筛选" }).click();
  await expect(page.locator(".archive-project")).toHaveCount(26);
});

test("@critical 命令面板可键盘搜索并进入统一创作工作区", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "搜索 NHB" })).toBeVisible();
  await page.keyboard.press("Control+K");
  const dialog = page.getByRole("dialog", { name: "搜索 NHB" });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder("搜索页面、工具或照片...").fill("创作");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/create$/);
  await expect(page.locator(".create-toolrail")).toBeVisible();
  await expect(page.locator(".studio-canvas-frame canvas")).toBeVisible();

  await expect.poll(() => page.locator(".studio-canvas-frame canvas").evaluate((canvas) => {
    const context = (canvas as HTMLCanvasElement).getContext("2d");
    if (!context) return 0;
    const { width, height } = canvas as HTMLCanvasElement;
    const pixels = context.getImageData(0, 0, width, height).data;
    const colors = new Set<string>();
    for (let index = 0; index < pixels.length; index += 16_000) {
      colors.add(`${pixels[index]}-${pixels[index + 1]}-${pixels[index + 2]}-${pixels[index + 3]}`);
    }
    return colors.size;
  })).toBeGreaterThan(6);
});

test("@critical 创作工作区自动保存并能导出 PNG", async ({ page }) => {
  await page.goto("/create");
  await page.evaluate(() => new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase("nhb-local-studio");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  }));
  await page.reload();
  const canvas = page.locator(".studio-canvas-frame canvas");
  await expect(canvas).toBeVisible();
  await expect(page.locator(".public-chat-widget")).toHaveCount(0);
  const projectName = page.getByRole("textbox", { name: "项目名称" });
  await projectName.fill("V4 Browser Study");
  await expect(page.locator(".studio-save-status")).toContainText("已保存", { timeout: 10_000 });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "项目名称" })).toHaveValue("V4 Browser Study");
  const exportButton = page.getByRole("button", { name: "PNG" });
  await expect(exportButton).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^nhb-filmstrip-\d+\.png$/);
});

test("@critical Studio 2.0 支持多项目、非破坏性画框与版本快照", async ({ page }) => {
  await page.goto("/create");
  await page.evaluate(() => new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase("nhb-local-studio");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  }));
  await page.reload();

  const shelf = page.locator(".studio-project-shelf");
  await expect(shelf).toBeVisible();
  await expect(page.locator(".studio-transform-controls")).toBeVisible();
  const zoom = page.locator('.studio-transform-controls input[type="range"]').first();
  await expect(zoom).toHaveValue("1");
  await zoom.fill("1.5");
  await expect(zoom).toHaveValue("1.5");

  await shelf.getByRole("button", { name: "SNAPSHOT" }).click();
  await expect(page.locator(".studio-project-shelf__versions button")).toHaveCount(1);
  await shelf.getByRole("button", { name: "NEW" }).click();
  await page.getByRole("textbox", { name: "项目名称" }).fill("Second Local Study");
  await expect(page.locator(".studio-save-status")).toContainText("已保存", { timeout: 10_000 });
  await expect(page.locator(".studio-project-shelf__list > button")).toHaveCount(2);
});

test("@critical 视觉故事支持章节索引、滚动进度与创建入口", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/stories");
  await expect(page.locator(".stories-v2-entry")).toHaveCount(3);
  await page.locator(".stories-v2-entry").first().getByRole("link", { name: /进入滚动故事/ }).click();
  await expect(page).toHaveURL(/\/stories\/weather-into-paper$/);
  await expect(page.locator(".visual-story-reader h1")).toContainText("Weather Into Paper");
  await expect(page.locator(".visual-story-index")).toBeVisible();
  const storyHeroGeometry = await page.locator(".visual-story-hero__copy").evaluate((element) => {
    const copy = element.getBoundingClientRect();
    const back = element.querySelector<HTMLElement>(".visual-story-back")!.getBoundingClientRect();
    const label = element.querySelector<HTMLElement>(".platform-index")!.getBoundingClientRect();
    return { left: copy.left, backBottom: back.bottom, labelTop: label.top };
  });
  expect(storyHeroGeometry.left).toBeGreaterThanOrEqual(20);
  expect(storyHeroGeometry.labelTop).toBeGreaterThanOrEqual(storyHeroGeometry.backBottom);

  const secondChapter = page.locator(".visual-story-chapter").nth(1);
  await secondChapter.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect(page.locator('.visual-story-index a[aria-current="step"]')).toContainText("风被织物看见");
  await expect.poll(() => page.locator(".visual-story-reader").evaluate((element) => Number.parseFloat(getComputedStyle(element).getPropertyValue("--story-progress")))).toBeGreaterThan(0);
  await expect(page.getByRole("link", { name: /打开 Story Builder/ })).toHaveAttribute("href", "/create/story");
});

test("@critical Story Builder 本地保存章节并导出项目", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase("nhb-local-studio");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  }));
  await page.goto("/create/story");
  await expect(page.locator(".story-builder-preview")).toBeVisible();
  await page.getByLabel("Project name").fill("Weather Builder Test");
  await expect(page.locator(".story-builder-topbar")).toContainText("SAVED LOCALLY", { timeout: 10_000 });
  const chapterCount = await page.locator(".story-builder-chapter-tabs button").count();
  await page.locator(".story-builder-controls section").nth(1).getByRole("button", { name: "Add" }).click();
  await expect(page.locator(".story-builder-chapter-tabs button")).toHaveCount(chapterCount + 1);

  const downloadPromise = page.waitForEvent("download");
  await page.getByTitle("Export project").click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.nhb-story$/);
  await page.reload();
  await expect(page.getByLabel("Project name")).toHaveValue("Weather Builder Test");
});

test("@critical 首页真实客片可切换并通向作品集与预约", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const hero = page.locator(".home-booking-hero");
  const heroImage = hero.locator(".home-booking-hero__media img");
  const selectorButtons = hero.locator(".home-booking-hero__selector button");
  await expect(hero).toBeVisible();
  await expect(selectorButtons).toHaveCount(3);
  const chatOverlapsIndex = await page.evaluate(() => {
    const chat = document.querySelector(".public-chat-launcher")?.getBoundingClientRect();
    const index = document.querySelector(".home-index-strip")?.getBoundingClientRect();
    return Boolean(chat && index
      && chat.left < index.right
      && chat.right > index.left
      && chat.top < index.bottom
      && chat.bottom > index.top);
  });
  expect(chatOverlapsIndex).toBe(false);
  const initialSource = await heroImage.evaluate((image) => (image as HTMLImageElement).currentSrc);
  await selectorButtons.nth(1).click();
  await expect(selectorButtons.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => heroImage.evaluate((image) => (image as HTMLImageElement).currentSrc)).not.toBe(initialSource);

  await hero.locator('.home-booking-secondary[href="/gallery"]').click();
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(page.locator(".gallery-page-contact-sheet")).toBeVisible();
});

test("@critical 暗房项目自动保存并能在刷新后恢复", async ({ page }) => {
  await page.goto("/editor");
  await page.evaluate(() => new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase("nhb-local-studio");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  }));
  await page.reload();
  await page.locator("[data-editor-sample]").first().click();
  await expect(page.locator(".editor-project-controls")).toBeVisible();

  const slider = page.locator('.editor-slider-group input[type="range"]').first();
  await expect(slider).toBeVisible();
  await slider.fill("24");
  await slider.dispatchEvent("mouseup");
  const projectStatus = page.locator(".editor-project-status");
  await expect(projectStatus).toContainText("正在保存...");
  await expect(projectStatus).toContainText("已保存到本地", { timeout: 10_000 });

  await page.reload();
  const restore = page.getByRole("button", { name: "恢复上次本地项目" });
  await expect(restore).toBeVisible();
  await restore.click();
  await expect(page.locator(".editor-project-controls")).toBeVisible();
  await expect(page.locator('.editor-slider-group input[type="range"]').first()).toHaveValue("24");
});

test("@critical 窄屏与减少动态模式无横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/archive");
  await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
  await expect(page.locator('.mobile-bottom-nav a[href="/booking"]')).toBeVisible();
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    transitionKind: document.documentElement.dataset.transitionKind || "",
  }));
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.transitionKind).toBe("");
});
