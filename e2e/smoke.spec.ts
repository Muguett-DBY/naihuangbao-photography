import { resolve } from "node:path";
import { test, expect, type Page } from "@playwright/test";

// Playwright config is at e2e/playwright.config.ts - run with: npx playwright test --config=e2e/playwright.config.ts

const editorTestImage = resolve("public/images/gallery/gallery-urban-01.webp");

type EditorUploadFile = string | {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

async function uploadEditorPhoto(page: Page, file: EditorUploadFile) {
  const uploadButton = page.locator(".editor-toolbar .editor-btn--primary").first();
  await expect(uploadButton).toBeVisible();
  const fileChooserPromise = page.waitForEvent("filechooser");
  await uploadButton.click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(file);
}

async function openGalleryFromNav(page: Page) {
  const inlineGalleryLink = page.locator('.nav-menu--inline a[href="/gallery"]').first();
  if (await inlineGalleryLink.isVisible()) {
    await inlineGalleryLink.click();
    return;
  }

  await page.locator(".hamburger").click();
  const overlayGalleryLink = page.locator('#site-navigation-menu a[href="/gallery"]').first();
  await expect(overlayGalleryLink).toBeVisible();
  await overlayGalleryLink.click();
}

test.describe("shoot.custard.top", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!window.location.search.includes("preserve-pwa-state")) {
        localStorage.clear();
      }
    });
  });

  test("首页加载正确", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/奶黄包摄影|Naihuangbao Photography/);
    await expect(page.locator(".hero")).toBeVisible();
    await expect(page.locator(".site-nav")).toBeVisible();
  });

  test("公开页面标题不会重复品牌名", async ({ page }) => {
    for (const path of ["/", "/gallery", "/booking", "/products", "/workshops", "/shop", "/courses", "/map"]) {
      await page.goto(path);
      await expect.poll(() => page.title()).toContain(" | ");
      const segments = (await page.title()).split("|").map((segment) => segment.trim());
      expect(new Set(segments).size, `${path}: ${segments.join(" | ")}`).toBe(segments.length);
    }
  });

  test("非画廊页面不会下载作品图片", async ({ page }) => {
    const galleryRequests: string[] = [];
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.startsWith("/images/gallery/")) galleryRequests.push(pathname);
    });

    await page.goto("/booking");
    await expect(page.locator(".booking-quick-cta")).toBeVisible();

    expect(galleryRequests).toEqual([]);
  });

  test("首页使用兼容 ScrollTrigger 的 GSAP 核心", async ({ page }) => {
    const gsapWarnings: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "warning" && message.text().includes("Requires GSAP")) {
        gsapWarnings.push(message.text());
      }
    });

    await page.goto("/");
    await expect(page.locator(".hero")).toBeVisible();
    const runtime = await page.evaluate(() => {
      const runtimeGsap = (window as Window & {
        gsap?: { version?: string; matchMedia?: unknown };
      }).gsap;
      return {
        version: runtimeGsap?.version ?? "missing",
        matchMediaType: typeof runtimeGsap?.matchMedia,
      };
    });

    expect(runtime.matchMediaType, `window.gsap ${runtime.version}`).toBe("function");
    expect(gsapWarnings).toEqual([]);
  });

  test("导航链接可点击跳转", async ({ page }) => {
    await page.goto("/");
    await openGalleryFromNav(page);
    await expect(page).toHaveURL(/\/gallery$/);
    await expect(page.locator("#gallery")).toBeVisible();
  });

  test("Lightbox 打开和关闭", async ({ page }) => {
    await page.goto("/");
    // Scroll to gallery
    await page.evaluate(() => document.getElementById("gallery")?.scrollIntoView());
    // Click the actual interactive control so layout shifts cannot land on article whitespace.
    const firstItemButton = page.locator(".gallery-masonry-item .gallery-masonry-btn").first();
    await expect(firstItemButton).toBeVisible({ timeout: 10000 });
    await firstItemButton.click();
    const lightbox = page.locator(".pswp");
    await expect(lightbox).toHaveCount(1);
    await expect(lightbox).toBeVisible();
    await page.locator(".pswp__button--close").click();
    await expect(lightbox).toHaveCount(0, { timeout: 10000 });
  });

  test("首页作品区和作品入口存在", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#featured")).toBeVisible();
    await expect(page.locator(".gallery-masonry-item").first()).toBeVisible();
    await expect(page.locator('.home-page-link[href="/gallery"]')).toBeVisible();
  });

  test("首页过渡动画不会替换已呈现内容", async ({ page }) => {
    await page.addInitScript(() => {
      const state: { current: Element | null; detachments: number } = {
        current: null,
        detachments: 0,
      };
      const rememberFeatured = (node: Node) => {
        if (!(node instanceof Element)) return;
        const featured = node.id === "featured" ? node : node.querySelector("#featured");
        if (!featured || featured === state.current) return;
        state.current = featured;
      };

      new MutationObserver((records) => {
        records.forEach((record) => {
          record.removedNodes.forEach((node) => {
            if (state.current && (node === state.current || (node instanceof Element && node.contains(state.current)))) {
              state.detachments += 1;
            }
          });
          record.addedNodes.forEach(rememberFeatured);
        });
      }).observe(document, { childList: true, subtree: true });

      Object.defineProperty(window, "__featuredDomDetachments", {
        configurable: true,
        get: () => state.detachments,
      });
    });

    await page.goto("/");
    await expect(page.locator(".gallery-masonry-item").first()).toBeVisible({ timeout: 10000 });
    const detachments = await page.evaluate(() => (
      window as Window & { __featuredDomDetachments?: number }
    ).__featuredDomDetachments ?? 0);
    expect(detachments).toBe(0);
  });

  test("首页作品卡片不嵌套交互控件", async ({ page }) => {
    await page.goto("/");
    await page.locator("#featured").scrollIntoViewIfNeeded();
    const firstCard = page.locator(".gallery-masonry-item").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await expect(firstCard.locator(".gallery-masonry-btn button, .gallery-masonry-btn a, .gallery-masonry-btn [tabindex]"))
      .toHaveCount(0);
  });

  test("AI 聊天正确呈现列表与代码块", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("nhb-push-dismissed", "true");
      localStorage.setItem("chat-history", JSON.stringify([{
        id: "assistant-markdown-qa",
        role: "assistant",
        content: "Intro\n\n- First\n- Second\n\nOutro\n\n```\n- not a list\n**not bold**\n```",
      }]));
    });
    await page.goto("/?preserve-pwa-state=1");
    await page.locator(".public-chat-launcher").click();

    const markdown = page.locator(".public-chat-markdown").first();
    await expect(markdown.locator(":scope > p")).toHaveCount(2);
    await expect(markdown.locator(":scope > ul > li")).toHaveCount(2);
    await expect(markdown.locator("ul ol, ol ul, li + br, br + li")).toHaveCount(0);
    await expect(markdown.locator(":scope > pre > code")).toHaveText("- not a list\n**not bold**");

    await page.setViewportSize({ width: 390, height: 844 });
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.viewport + 1);
  });

  test("深色模式切换", async ({ page }) => {
    await page.goto("/");
    await page.locator(".nav-utility-trigger").click();
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  });

  test("首页预约 CTA 打开可填写表单", async ({ page }) => {
    await page.goto("/");
    await page.locator(".hero-cover-primary-btn").click();
    // Wait for modal to open - it's a multi-step form, Step 1 shows package/date/time
    await expect(page.locator("#booking-package")).toBeVisible();
    await expect(page.locator("#booking-time")).toBeVisible();
    // Click Next to go to Step 2 where name/contact are
    await page.locator("button:has-text('Next')").click();
    await expect(page.locator("#booking-name")).toBeVisible();
    await expect(page.locator("#booking-contact")).toBeVisible();
  });

  test("登录与注册表单可切换且标签关联正确", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();
    await page.locator(".login-toggle").click();
    await expect(page.locator('label[for="displayName"]')).toBeVisible();
  });

  test("后台登录入口可访问", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator(".adm-login-box")).toBeVisible();
    await expect(page.locator(".adm-login-box input")).toBeVisible();
  });

  test("修图页保留上传入口", async ({ page }) => {
    await page.goto("/editor");
    await expect(page.locator(".editor-root")).toBeVisible();
    await expect(page.locator('.editor-toolbar input[type="file"]')).toBeAttached();
  });

  test("修图页上传后导出按钮可点击", async ({ page }) => {
    await page.goto("/editor");
    await uploadEditorPhoto(page, editorTestImage);
    await expect(page.locator(".editor-canvas")).toBeVisible({ timeout: 15000 });
    const exportButton = page.locator('.editor-toolbar button[aria-label="导出"], .editor-toolbar button[aria-label="Export"]');
    await exportButton.evaluate((element) => element.scrollIntoView({ block: "start", inline: "nearest" }));
    await exportButton.click();
    await expect(page.locator(".editor-modal")).toBeVisible();
  });

  test("修图页模型失败后仍可导出并重试", async ({ page }) => {
    await page.route("**/models/**", route => route.abort("failed"));
    await page.goto("/editor");
    await uploadEditorPhoto(page, editorTestImage);

    await expect(page.locator(".editor-canvas")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".editor-model-fallback")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".editor-model-retry")).toBeVisible();

    const exportButton = page.locator('.editor-toolbar button[aria-label="导出"], .editor-toolbar button[aria-label="Export"]');
    await exportButton.evaluate((element) => element.scrollIntoView({ block: "start", inline: "nearest" }));
    await exportButton.click();
    await expect(page.locator(".editor-modal")).toBeVisible();
  });

  test("修图页损坏图片失败后可以重新上传", async ({ page }) => {
    await page.goto("/editor");
    await uploadEditorPhoto(page, {
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("not a decodable image"),
    });

    await expect(page.locator(".editor-image-error")).toBeVisible();
    await expect(page.locator(".editor-recovery-panel")).toBeVisible();
    await expect(page.locator(".editor-canvas--error")).toBeVisible();
    await expect(page.locator(".editor-recovery-action")).toBeVisible();
    await expect(page.locator(".editor-overlay")).toBeHidden();

    await uploadEditorPhoto(page, editorTestImage);
    await expect(page.locator(".editor-image-error")).toBeHidden();
    await expect(page.locator(".editor-canvas")).toBeVisible({ timeout: 15000 });
  });

  test("移动端首页没有横向溢出", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.viewport + 1);
    await expect(page.locator(".hamburger")).toBeVisible();
  });

  test("PWA 安装提示跨访问出现并等待浏览器安装结果", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("nhb-visit-count", "1");
    });
    await page.goto("/?preserve-pwa-state=1");

    await page.evaluate(() => {
      type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };
      type InstallTestWindow = Window & {
        resolveInstallChoice?: (choice: InstallChoice) => void;
      };
      let resolveChoice: ((choice: InstallChoice) => void) | undefined;
      const event = new Event("beforeinstallprompt");
      Object.defineProperty(event, "prompt", { value: () => Promise.resolve() });
      Object.defineProperty(event, "userChoice", {
        value: new Promise<InstallChoice>((resolve) => {
          resolveChoice = resolve;
        }),
      });
      (window as InstallTestWindow).resolveInstallChoice = (choice) => resolveChoice?.(choice);
      window.dispatchEvent(event);
    });

    const banner = page.locator(".pwa-install-banner");
    await expect(banner).toBeVisible({ timeout: 6000 });
    const installButton = banner.locator(".pwa-install-btn");
    await installButton.click();
    await expect(installButton).toBeDisabled();
    await expect(banner.locator(".pwa-install-status")).toBeVisible();

    await page.evaluate(() => {
      const testWindow = window as Window & {
        resolveInstallChoice?: (choice: { outcome: "accepted"; platform: string }) => void;
      };
      testWindow.resolveInstallChoice?.({ outcome: "accepted", platform: "web" });
    });
    await expect(banner).toBeHidden();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("nhb-pwa-installed"))).toBe("true");
  });

  test("移动端导航可打开作品页", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await openGalleryFromNav(page);
    await expect(page).toHaveURL(/\/gallery$/);
    await expect(page.locator("#gallery")).toBeVisible();
  });

  test("移动端底部导航覆盖核心路径并打开预约", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const bottomNav = page.locator(".mobile-bottom-nav");
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.locator('a[href="/"]')).toHaveAttribute("aria-current", "page");

    await bottomNav.locator('a[href="/gallery"]').click();
    await expect(page).toHaveURL(/\/gallery$/);
    await expect(bottomNav.locator('a[href="/gallery"]')).toHaveAttribute("aria-current", "page");

    await bottomNav.locator("button.mobile-bottom-nav__booking").click();
    // Wait for modal to open - it's a multi-step form
    await expect(page.locator("#booking-package")).toBeVisible();
    await page.keyboard.press("Escape");

    await bottomNav.locator('a[href="/editor"]').click();
    await expect(page).toHaveURL(/\/editor$/);
    await expect(page.locator(".editor-root")).toBeVisible();
    await expect(page.locator(".mobile-bottom-nav")).toHaveCount(0);
  });
});
