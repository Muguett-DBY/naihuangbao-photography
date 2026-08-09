import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("lang", "zh-CN");
    localStorage.setItem("nhb-motion-mode", "full");
  });
});

test("@critical 首页使用真实授权作品且约拍内容契约完整", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".home-booking-hero h1")).toHaveCount(1);
  await expect(page.locator(".home-booking-hero__selector button")).toHaveCount(3);
  await expect(page.locator(".home-booking-photo")).toHaveCount(6);
  await expect(page.locator(".home-booking-packages .package-card")).toHaveCount(3);
  await expect(page.locator(".home-booking-process__steps li")).toHaveCount(5);
  await expect(page.locator(".home-booking-final button")).toBeVisible();
  await expect(page.locator(".cinematic-premiere, .visual-light-table, .home-visual-system")).toHaveCount(0);

  const routes = await (await request.get("/route-contract.json")).json();
  const assets = await (await request.get("/visual-asset-manifest.json")).json();
  expect(routes.routes).toHaveLength(33);
  expect(assets.assets).toHaveLength(94);
  expect(assets.assets.filter((asset: { src: string }) => asset.src.includes("visual-os-v8"))).toHaveLength(24);
});

test("@critical V8 Asset Vault 导入、近重复过滤和项目批量关联闭环", async ({ page }) => {
  await page.goto("/vault");
  await expect(page.locator("[data-vault-ready=true]")).toBeVisible();
  const file = resolve(process.cwd(), "public/images/visual-os-v8/640/01-cream-paper-pavilion.webp");
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(file);
  await expect(page.locator("[data-vault-asset]")).toHaveCount(1);
  await expect(page.locator(".asset-vault__intake")).toContainText("1 originals indexed");

  await input.setInputFiles(file);
  await expect(page.locator("[data-vault-asset]")).toHaveCount(1);
  await expect(page.locator(".asset-vault__intake")).toContainText("near-duplicates skipped");

  await page.goto("/projects");
  await expect(page.locator(".workspace-project__grid figure")).toHaveCount(1);
  await expect(page.locator(".workspace-project__grid img")).toBeVisible();
});

test("@critical V8 创意策展进入 Scene Composer 且场景生命周期稳定", async ({ page }) => {
  await page.goto("/curate");
  await expect(page.locator(".curator-sequence figure")).toHaveCount(12);
  await page.getByRole("button", { name: "6 FRAMES" }).click();
  await page.getByRole("button", { name: /CURATE AGAIN/ }).click();
  await expect(page.locator(".curator-sequence figure")).toHaveCount(6);
  await page.getByRole("button", { name: /ADD TO PROJECT/ }).click();
  await expect(page.getByRole("status")).toContainText("6 frames added");
  await page.getByRole("button", { name: /OPEN IN COMPOSER/ }).click();
  await expect(page).toHaveURL(/\/compose$/);
  await expect(page.locator("[data-scene-composer=v8]")).toBeVisible();
  await expect(page.locator(".scene-timeline__track article")).toHaveCount(5);

  await page.getByTitle("Duplicate scene").first().click();
  await expect(page.locator(".scene-timeline__track article")).toHaveCount(6);
  await expect(page.locator(".scene-composer-loading")).toHaveCount(0);
  await page.getByTitle("Delete scene").last().click();
  await expect(page.locator(".scene-timeline__track article")).toHaveCount(5);
});

test("@critical V8 项目指挥台、展览导演和无账户云同步状态可用", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.locator(".project-command")).toBeVisible();
  await expect(page.locator('.project-command__surfaces a[href="/vault"]')).toBeVisible();
  await expect(page.locator('.project-command__surfaces a[href="/compose"]')).toBeVisible();
  await expect(page.locator('.project-command__surfaces a[href="/curate"]')).toBeVisible();
  await page.getByRole("button", { name: /Night/ }).click();
  await page.getByRole("button", { name: "IMMERSIVE" }).click();
  await page.getByRole("button", { name: "FULL MOTION" }).click();
  await expect(page.getByRole("button", { name: /Night/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "IMMERSIVE" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".project-sync__signin")).toContainText("No account is required");
});

test("@critical V8 展览引擎支持主题、索引、嵌入和固定历史版本", async ({ page }) => {
  const project = {
    id: "exhibition-v8", version: 2, projectType: "workspace", name: "Quiet Nocturne", description: "An immutable V8 exhibition study.", accent: "#9b4157",
    assets: [
      { assetId: "night", src: "/images/visual-os-v8/17-night-projection-arch.webp", alt: "Night arch", title: "Night arch", source: "archive", addedAt: 1 },
      { assetId: "glass", src: "/images/visual-os-v8/18-nocturne-glass-column.webp", alt: "Glass column", title: "Glass column", source: "archive", addedAt: 2 },
      { assetId: "paper", src: "/images/visual-os-v8/19-lantern-paper-field.webp", alt: "Paper field", title: "Paper field", source: "archive", addedAt: 3 },
    ],
    vaultAssetIds: [], creativeDocumentIds: [], compositionIds: [], storyIds: [], activeSurface: "publish", status: "published",
    exhibition: { theme: "night", density: "immersive", motion: "full", showIndex: true }, createdAt: 1, updatedAt: 2, lastOpenedAt: 2,
  };
  const versions = [2, 1].map((version) => ({ slug: "quiet-nocturne", version, publishedAt: `2026-08-0${version}T00:00:00.000Z`, contentHash: String(version).repeat(64) }));
  await page.route("**/api/projects/published/quiet-nocturne**", (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("versions") === "1") return route.fulfill({ contentType: "application/json", body: JSON.stringify({ versions }) });
    const version = Number(url.searchParams.get("version") || 2);
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ id: `edition-${version}`, slug: "quiet-nocturne", version, publishedAt: versions.find((entry) => entry.version === version)?.publishedAt, schemaVersion: 1, contentHash: String(version).repeat(64), project }) });
  });

  await page.goto("/share/quiet-nocturne?version=1");
  await expect(page.locator(".published-project")).toHaveClass(/exhibition--night/);
  await expect(page.locator(".published-project")).toHaveClass(/exhibition--immersive/);
  await expect(page.locator(".exhibition-index a")).toHaveCount(3);
  await expect(page.locator(".published-project__grid figure")).toHaveCount(3);
  await page.getByRole("button", { name: /V02/ }).click();
  await expect(page).toHaveURL(/version=2/);
  await expect(page.locator(".published-project__intro")).toContainText("EDITION 02");

  await page.goto("/share/quiet-nocturne?version=2&embed=1");
  await expect(page.locator(".published-project")).toHaveClass(/exhibition--embedded/);
  await expect(page.locator(".exhibition-utility")).toBeHidden();
  await expect(page.locator(".published-project__footer")).toHaveCount(0);
});

test("V8 新工作台在窄屏减少动态模式下无横向溢出", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/vault", "/curate", "/compose", "/projects"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${path} overflowed`).toBe(true);
  }
});
