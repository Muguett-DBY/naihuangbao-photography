import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("lang", "zh-CN");
    localStorage.setItem("nhb-motion-mode", "full");
  });
});

test("@critical 首页保持用户控制的客片切换与首屏预约操作", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const hero = page.locator(".home-booking-hero");
  const heroImage = hero.locator(".home-booking-hero__media img");
  const selectorButtons = hero.locator(".home-booking-hero__selector button");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(hero.locator(".home-booking-primary")).toBeVisible();
  await expect(selectorButtons).toHaveCount(3);
  const initialSource = await heroImage.evaluate((image) => (image as HTMLImageElement).currentSrc);
  await page.evaluate(() => window.scrollTo({ top: Math.round(window.innerHeight * 0.48), behavior: "instant" }));
  await expect.poll(() => heroImage.evaluate((image) => (image as HTMLImageElement).currentSrc)).toBe(initialSource);
  await selectorButtons.nth(1).click();
  await expect.poll(() => heroImage.evaluate((image) => (image as HTMLImageElement).currentSrc)).not.toBe(initialSource);
  await hero.locator(".home-booking-primary").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-runtime-quality", /^(full|balanced|economy)$/);
});

test("@critical V7 智能归档支持语义搜索、本地图像分析与 Project Dock", async ({ page }) => {
  await page.goto("/archive");
  const lab = page.locator(".archive-intelligence");
  const search = lab.getByRole("textbox", { name: "Search the visual archive" });
  await search.fill("珊瑚 深莓 暗房");
  await search.press("Enter");
  await expect(lab.locator(".archive-intelligence__results article").first()).toContainText(/CORAL|BERRY|珊瑚/);

  const referencePath = resolve(process.cwd(), "public/images/visual-os-v8/05-water-glass-prism-table.webp");
  await lab.locator('input[type="file"]').setInputFiles(referencePath);
  await expect(lab.getByRole("status")).toContainText("没有上传");
  await expect(lab.locator(".archive-intelligence__reference-preview")).toBeVisible();

  await lab.locator(".archive-intelligence__results article").first().getByRole("button", { name: /Add to project/ }).click();
  const dockTrigger = page.locator(".project-dock__trigger");
  await expect(dockTrigger).toContainText("1");
  await dockTrigger.click();
  await expect(page.locator("#project-dock-panel")).toBeVisible();
  await expect(page.locator("#project-dock-panel .project-dock__assets button")).toHaveCount(1);
});

test("@critical V7 Studio 4 与 Story Director 共享项目素材和场景参数", async ({ page }) => {
  await page.goto("/archive");
  await page.locator(".archive-intelligence__results article").first().getByRole("button", { name: /Add to project/ }).click();
  await page.goto("/create");
  await page.getByRole("group", { name: "Artboard preset" }).getByRole("button", { name: /9:16/ }).click();
  await expect(page.locator(".studio-canvas-frame canvas")).toHaveAttribute("width", "1080");
  await expect(page.locator(".studio-canvas-frame canvas")).toHaveAttribute("height", "1920");
  await page.getByRole("button", { name: "ROUNDED" }).click();
  await expect(page.getByRole("button", { name: "ROUNDED" })).toHaveClass(/is-active/);
  await page.getByRole("button", { name: "Lock layer" }).click();
  await expect(page.locator(".studio-transform-controls input[type=range]").first()).toBeDisabled();
  await page.getByRole("button", { name: /LOAD ASSETS/ }).click();
  await expect(page.locator(".studio-image-strip > div")).toHaveCount(6);

  await page.goto("/create/story");
  const director = page.locator(".scene-director-controls");
  await expect(director).toBeVisible();
  await director.locator('[data-scene-transition="slice"]').click();
  await expect(page.locator(".story-builder-preview__chapter.is-active")).toHaveAttribute("data-scene-transition", "slice");
  await director.locator('input[type="range"]').first().fill("1500");
  await expect(page.locator(".story-builder-preview__chapter.is-active")).toHaveAttribute("style", /1500ms/);
});

test("@critical V7 项目发布、版本恢复和公开分享页契约可用", async ({ page }) => {
  const publishedProject = {
    id: "published-1",
    slug: "visual-study-test",
    version: 2,
    publishedAt: "2026-08-09T00:00:00.000Z",
    schemaVersion: 1,
    contentHash: "a".repeat(64),
    project: {
      id: "workspace-test", version: 1, projectType: "workspace", name: "Visual Study", description: "Personal practice", accent: "#d25f62",
      assets: [{ assetId: "rain", src: "/images/visual-os-v7/05-rain-observatory.webp", alt: "Rain observatory", title: "Rain observatory", source: "archive", addedAt: 1 }],
      compositionIds: [], storyIds: [], activeSurface: "publish", createdAt: 1, updatedAt: 2,
    },
  };
  await page.route("**/api/projects/publish", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: publishedProject.id, slug: publishedProject.slug, version: 2, publishedAt: publishedProject.publishedAt, contentHash: publishedProject.contentHash, url: `/share/${publishedProject.slug}` }) }));
  await page.route("**/api/projects/published/visual-study-test**", (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("versions") === "1") return route.fulfill({ contentType: "application/json", body: JSON.stringify({ versions: [{ slug: publishedProject.slug, version: 2, publishedAt: publishedProject.publishedAt, contentHash: publishedProject.contentHash }] }) });
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(publishedProject) });
  });

  await page.goto("/archive");
  const addToProject = page.locator('.archive-intelligence__results article [data-action="toggle-project-asset"]').first();
  await addToProject.click();
  await expect(addToProject).toHaveClass(/is-saved/);
  await expect(addToProject).toHaveAttribute("data-workspace-persistence", "idle");
  await page.goto("/projects");
  await page.locator('[data-action="publish-project"]').click();
  await expect(page.locator('[data-action="open-publication"]')).toHaveAttribute("href", "/share/visual-study-test");
  await expect(page.locator(".workspace-project__versions article")).toHaveCount(1);
  await page.locator('[data-action="restore-version"]').click();
  await expect(page.getByRole("status")).toContainText("已恢复");

  await page.goto("/share/visual-study-test");
  await expect(page.getByRole("heading", { level: 1, name: "Visual Study" })).toBeVisible();
  await expect(page.locator(".published-project__grid figure")).toHaveCount(1);
  await expect(page.locator(".published-project__intro button")).toBeVisible();
});

test("V7 减少动态和窄屏保持经济档、键盘可达且无横向溢出", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-runtime-quality", "economy");
  await expect(page.locator(".home-booking-hero")).toBeVisible();
  const transitionDurationMs = await page.locator(".home-booking-hero__selector button").first().evaluate((button) => (
    Number.parseFloat(getComputedStyle(button).transitionDuration) * 1_000
  ));
  expect(transitionDurationMs).toBeLessThanOrEqual(0.1);
  await expect(page.locator(".immersive-experience-canvas")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
});
