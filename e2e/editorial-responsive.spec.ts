import { expect, test, type Locator, type Page } from "@playwright/test";

const course = {
  id: "course-1",
  title: "Editorial portrait lighting",
  description: "A practical introduction to portrait light and visual sequencing.",
  cover_image_url: "/images/gallery/gallery-garden-01.webp",
  category: "beginner",
  difficulty: "beginner",
  duration_minutes: 95,
  price_cents: 39900,
  price_display: "CNY 399",
  currency: "CNY",
  sort_order: 1,
  published: 1,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

const preset = {
  id: "preset-1",
  name: "City wall dusk",
  description: "A restrained city palette that preserves natural skin tones.",
  category: "lightroom",
  preview_images: [
    "/images/gallery/gallery-urban-01.webp",
    "/images/gallery/gallery-garden-01.webp",
  ],
  download_url: "/downloads/city-wall-dusk.zip",
  price_display: "CNY 89",
  featured: 1,
  download_count: 128,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

const workshop = {
  id: "workshop-1",
  title: "Lakeside morning portraits",
  description: "An outdoor portrait session built around layered morning light.",
  cover_image_url: "/images/gallery/gallery-jiangnan-01.webp",
  event_date: "2099-08-18",
  event_time: "07:00",
  location: "Nanjing Xuanwu Lake",
  max_participants: 8,
  current_participants: 3,
  price_cents: 69900,
  price_display: "CNY 699",
  currency: "CNY",
  status: "upcoming",
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

const merchandise = {
  id: "item-1",
  name: "Hand-bound portrait album",
  description: "A cloth-bound album for a complete portrait story.",
  images: [
    "/images/gallery/gallery-daily-01.webp",
    "/images/gallery/gallery-garden-01.webp",
  ],
  category: "album",
  price_display: "CNY 299",
  available: 1,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

const publicRoutes = [
  { path: "/", action: ".hero-cover-primary-btn" },
  { path: "/gallery", action: ".gallery-search-input" },
  { path: "/gallery/gallery-urban-01", action: ".photo-detail-cta-link" },
  { path: "/courses", action: ".catalogue-card-footer" },
  { path: "/courses/course-1", action: ".course-detail-cta-link" },
  { path: "/products", action: ".preset-download-btn" },
  { path: "/presets/preset-1", action: ".preset-detail-download-btn" },
  { path: "/workshops", action: ".workshop-card .catalogue-primary-button" },
  { path: "/workshops/workshop-1", action: ".catalogue-primary-button" },
  { path: "/shop", action: ".merchandise-inquire-btn" },
  { path: "/shop/item-1", action: ".shop-detail-inquire-btn" },
  { path: "/booking", action: ".booking-quick-cta-btn" },
  { path: "/map", action: ".map-view-btn" },
  { path: "/login", action: ".login-button" },
  { path: "/compare", action: ".compare-page-cta" },
  { path: "/editor", action: ".editor-btn--primary" },
] as const;

const viewports = [
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

type PlaywrightRoute = Parameters<Parameters<Page["route"]>[1]>[0];

async function fulfillJson(route: PlaywrightRoute, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockPublicApi(page: Page) {
  await page.route("**/api/**", (route) => fulfillJson(route, { error: "unexpected_e2e_request" }, 501));
  await page.route("**/api/auth/session", (route) => fulfillJson(route, { authenticated: false, user: null }));
  await page.route("**/api/content", (route) => fulfillJson(route, { content: {} }));
  await page.route("**/api/photos", (route) => fulfillJson(route, { photos: [] }));
  await page.route("**/api/booking/policy", (route) => fulfillJson(route, {
    earliestDate: "2099-08-01",
    timeZone: "Asia/Shanghai",
    capacityPerDay: 3,
    dateFormat: "YYYY-MM-DD",
    unavailableReasons: {
      beforeEarliest: "before_earliest",
      fullyBooked: "fully_booked",
      invalidDate: "invalid_date",
    },
    generatedAt: "2099-08-01T00:00:00Z",
  }));
  await page.route("**/api/availability?**", (route) => fulfillJson(route, {
    capacityPerDay: 3,
    dates: {
      "2099-08-18": { status: "available", count: 0, capacity: 3, remaining: 3 },
    },
  }));
  await page.route("**/api/courses/course-1", (route) => fulfillJson(route, {
    course,
    modules: [
      { id: "module-1", course_id: course.id, title: "Read the light", type: "text", content: "Start with direction and contrast.", sort_order: 1 },
    ],
  }));
  await page.route("**/api/courses", (route) => fulfillJson(route, { courses: [course] }));
  await page.route("**/api/presets/preset-1", (route) => fulfillJson(route, { preset }));
  await page.route("**/api/presets", (route) => fulfillJson(route, { presets: [preset] }));
  await page.route("**/api/workshops/workshop-1", (route) => fulfillJson(route, { workshop }));
  await page.route("**/api/workshops", (route) => fulfillJson(route, { workshops: [workshop] }));
  await page.route("**/api/merchandise/item-1", (route) => fulfillJson(route, { merchandise }));
  await page.route("**/api/merchandise", (route) => fulfillJson(route, { merchandise: [merchandise] }));

  const transparentPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XQzLAAAAAElFTkSuQmCC",
    "base64",
  );
  await page.route("https://*.basemaps.cartocdn.com/**", (route) => route.fulfill({
    status: 200,
    contentType: "image/png",
    body: transparentPng,
  }));
}

function observeRuntimeFailures(page: Page) {
  const failures: string[] = [];
  let currentPath = "startup";
  const appOrigin = new URL(process.env.BASE_URL || "http://127.0.0.1:4174").origin;

  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`${currentPath}: console: ${message.text()}`);
  });
  page.on("pageerror", (error) => failures.push(`${currentPath}: pageerror: ${error.message}`));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === appOrigin && response.status() >= 400) {
      failures.push(`${currentPath}: response ${response.status()}: ${url.pathname}${url.search}`);
    }
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    const reason = request.failure()?.errorText ?? "unknown failure";
    if (url.origin === appOrigin && !reason.includes("ERR_ABORTED")) {
      failures.push(`${currentPath}: request failed: ${url.pathname}${url.search} (${reason})`);
    }
  });

  return {
    failures,
    setPath(path: string) {
      currentPath = path;
    },
  };
}

async function settleRoute(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await page.waitForTimeout(250);
}

async function expectNoOverflowOrLayerCollision(page: Page, path: string, actionSelector: string) {
  const topAudit = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const masthead = document.querySelector(".site-nav");
    if (!h1 || !masthead) return { titleOverlap: false, titleClipped: false };
    const heading = h1.getBoundingClientRect();
    const nav = masthead.getBoundingClientRect();
    const textRange = document.createRange();
    textRange.selectNodeContents(h1);
    const textRects = [...textRange.getClientRects()];
    return {
      titleOverlap: heading.left < nav.right - 2
        && heading.right > nav.left + 2
        && heading.top < nav.bottom - 2
        && heading.bottom > nav.top + 2,
      titleClipped: textRects.some((rect) => rect.left < -1 || rect.right > window.innerWidth + 1),
    };
  });
  expect(topAudit.titleOverlap, `${path}: h1 intersects the fixed masthead at route start`).toBe(false);
  expect(topAudit.titleClipped, `${path}: h1 is clipped at route start`).toBe(false);

  const action = page.locator(actionSelector).first();
  await expect(action, `${path}: primary action ${actionSelector}`).toBeVisible();
  await action.evaluate((element) => element.scrollIntoView({ block: "center", inline: "center" }));
  await page.waitForTimeout(100);

  const audit = await page.evaluate(({ selector }) => {
    type Rect = { top: number; right: number; bottom: number; left: number };
    const fixedSelectors = [
      ".site-nav",
      ".mobile-bottom-nav",
      ".public-chat-launcher",
      ".nhb-scroll-top",
      ".section-nav",
    ];
    const isVisible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number.parseFloat(style.opacity || "1") > 0.05
        && rect.width > 1
        && rect.height > 1
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < innerHeight
        && rect.left < innerWidth;
    };
    const rectFor = (element: Element): Rect => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left };
    };
    const intersects = (a: Rect, b: Rect) => (
      a.left < b.right - 2
      && a.right > b.left + 2
      && a.top < b.bottom - 2
      && a.bottom > b.top + 2
    );
    const layers = fixedSelectors.flatMap((fixedSelector) => {
      const element = document.querySelector(fixedSelector);
      return element && isVisible(element)
        ? [{ selector: fixedSelector, rect: rectFor(element) }]
        : [];
    });
    const overlaps: string[] = [];
    for (let first = 0; first < layers.length; first += 1) {
      for (let second = first + 1; second < layers.length; second += 1) {
        if (intersects(layers[first].rect, layers[second].rect)) {
          overlaps.push(`${layers[first].selector} intersects ${layers[second].selector}`);
        }
      }
    }

    const actionElement = document.querySelector(selector);
    if (actionElement && isVisible(actionElement)) {
      const actionRect = rectFor(actionElement);
      for (const layer of layers) {
        if (intersects(actionRect, layer.rect)) overlaps.push(`${selector} intersects ${layer.selector}`);
      }
    }

    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      overlaps,
      actionClipped: !actionElement
        || actionElement.scrollWidth > actionElement.clientWidth + 1
        || actionElement.scrollHeight > actionElement.clientHeight + 1,
    };
  }, { selector: actionSelector });

  expect(audit.documentWidth, `${path}: horizontal overflow`).toBeLessThanOrEqual(audit.viewportWidth + 1);
  expect(audit.overlaps, `${path}: incoherent fixed-layer overlap`).toEqual([]);
  expect(audit.actionClipped, `${path}: primary action content is clipped`).toBe(false);
}

async function expectVisibleKeyboardFocus(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect(locator).toBeFocused();
  const focus = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focusVisible: element.matches(":focus-visible"),
      outline: style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) >= 2,
      shadow: style.boxShadow !== "none",
    };
  });
  expect(focus.focusVisible).toBe(true);
  expect(focus.outline || focus.shadow).toBe(true);
}

async function tabUntilFocused(page: Page, target: Locator, attempts = 8) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
}

function durationToMilliseconds(value: string) {
  const trimmed = value.trim();
  if (trimmed.endsWith("ms")) return Number.parseFloat(trimmed);
  if (trimmed.endsWith("s")) return Number.parseFloat(trimmed) * 1000;
  return 0;
}

async function expectMotionDisabled(page: Page, path: string) {
  const offenders = await page.evaluate((routePath) => {
    const toMilliseconds = (value: string) => {
      const trimmed = value.trim();
      if (trimmed.endsWith("ms")) return Number.parseFloat(trimmed);
      if (trimmed.endsWith("s")) return Number.parseFloat(trimmed) * 1000;
      return 0;
    };
    const maxDuration = (value: string) => Math.max(...value.split(",").map(toMilliseconds));
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };

    return Array.from(document.querySelectorAll("body *"))
      .filter(visible)
      .flatMap((element) => {
        const style = getComputedStyle(element);
        const animation = maxDuration(style.animationDuration);
        const transition = maxDuration(style.transitionDuration);
        return animation > 0.1 || transition > 0.1
          ? [`${routePath}: ${element.tagName.toLowerCase()}.${element.className} (${animation}ms animation, ${transition}ms transition)`]
          : [];
      })
      .slice(0, 20);
  }, path);

  expect(offenders).toEqual([]);
  const scrollBehavior = await page.evaluate(() => ({
    html: getComputedStyle(document.documentElement).scrollBehavior,
    body: getComputedStyle(document.body).scrollBehavior,
  }));
  expect(["auto", "instant"]).toContain(scrollBehavior.html);
  expect(["auto", "instant"]).toContain(scrollBehavior.body);
}

test.describe("six-width public route contract", () => {
  test.describe.configure({ mode: "parallel" });
  test.use({ serviceWorkers: "block" });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("lang", "en");
      localStorage.setItem("nhb-pwa-install-dismissed-until", String(Date.now() + 86_400_000));
    });
    await mockPublicApi(page);
  });

  for (const viewport of viewports) {
    test(`${viewport.width}px renders every anonymous route without overflow or runtime failures`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(viewport);
      const runtime = observeRuntimeFailures(page);

      for (const route of publicRoutes) {
        runtime.setPath(route.path);
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await settleRoute(page);
        await expect(page.locator("main"), `${route.path}: exactly one main landmark`).toHaveCount(1);
        await expectNoOverflowOrLayerCollision(page, route.path, route.action);
        expect(runtime.failures, `${route.path}: browser/runtime failures`).toEqual([]);
      }
    });
  }
});

test.describe("short desktop hero contract", () => {
  test.use({ serviceWorkers: "block", viewport: { width: 1258, height: 622 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("lang", "en");
      localStorage.setItem("nhb-pwa-install-dismissed-until", String(Date.now() + 86_400_000));
    });
    await mockPublicApi(page);
  });

  test("hero title and actions remain inside the cover while the next section stays visible", async ({ page }) => {
    await page.goto("/");
    await settleRoute(page);
    const geometry = await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>(".hero-home")!.getBoundingClientRect();
      const title = document.querySelector<HTMLElement>(".hero-title")!;
      const actions = document.querySelector<HTMLElement>(".hero-actions")!.getBoundingClientRect();
      const index = document.querySelector<HTMLElement>(".home-index-strip")!.getBoundingClientRect();
      return {
        actionsInside: actions.top >= hero.top && actions.bottom <= hero.bottom,
        titleClipped: title.scrollWidth > title.clientWidth + 1,
        nextSectionVisible: index.top < window.innerHeight,
      };
    });
    expect(geometry).toEqual({ actionsInside: true, titleClipped: false, nextSectionVisible: true });
  });
});

test.describe("keyboard, focus, and dialog contracts", () => {
  test.use({ serviceWorkers: "block" });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("lang", "en");
      localStorage.setItem("nhb-pwa-install-dismissed-until", String(Date.now() + 86_400_000));
    });
    await mockPublicApi(page);
  });

  test("desktop masthead and gallery filters expose visible keyboard focus", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expectVisibleKeyboardFocus(page.locator(".skip-link").first());
    await page.keyboard.press("Enter");
    await expectVisibleKeyboardFocus(page.locator("#main-content"));

    const utility = page.locator(".nav-utility-trigger");
    await utility.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#nav-utility-panel")).toBeVisible();
    await expectVisibleKeyboardFocus(page.locator("#nav-utility-panel button").first());
    await page.keyboard.press("Escape");
    await expect(page.locator("#nav-utility-panel")).toBeHidden();
    await expectVisibleKeyboardFocus(utility);

    await page.goto("/gallery");
    const search = page.locator(".gallery-search-input");
    await search.focus();
    await expectVisibleKeyboardFocus(search);
    await page.keyboard.press("Tab");
    await expectVisibleKeyboardFocus(page.locator(".gallery-view-btn").first());

    const firstFilter = page.locator(".filter-row button:enabled").first();
    await firstFilter.focus();
    await expectVisibleKeyboardFocus(firstFilter);
    await page.keyboard.press("Tab");
    await expectVisibleKeyboardFocus(page.locator(".filter-row button:enabled").nth(1));
  });

  test("mobile drawer traps focus, closes with Escape, and returns focus", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const opener = page.locator(".hamburger");
    await opener.focus();
    await expectVisibleKeyboardFocus(opener);
    await page.keyboard.press("Enter");

    const drawer = page.locator("#site-navigation-menu");
    await expect(drawer).toBeVisible();
    await expectVisibleKeyboardFocus(drawer.locator(".nav-drawer-close"));
    for (let index = 0; index < 8; index += 1) {
      await page.keyboard.press("Tab");
      expect(await drawer.evaluate((element) => element.contains(document.activeElement))).toBe(true);
      await expectVisibleKeyboardFocus(page.locator(":focus"));
    }

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expectVisibleKeyboardFocus(opener);
  });

  test("booking form and compare dialog close with Escape and restore focus", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/booking");
    const bookingOpener = page.locator(".booking-quick-cta-btn");
    await bookingOpener.focus();
    await page.keyboard.press("Enter");
    const bookingDialog = page.getByRole("dialog");
    await expect(bookingDialog).toBeVisible();
    await expectVisibleKeyboardFocus(page.locator(".booking-modal-close"));

    await tabUntilFocused(page, page.locator("#booking-package"));
    await expectVisibleKeyboardFocus(page.locator("#booking-package"));
    await page.keyboard.press("Escape");
    await expect(bookingDialog).toBeHidden();
    await expectVisibleKeyboardFocus(bookingOpener);

    await page.goto("/compare");
    const shortcutOpener = page.locator(".compare-page-shortcuts-btn");
    await shortcutOpener.focus();
    await page.keyboard.press("Enter");
    const shortcutDialog = page.locator(".compare-page-shortcuts");
    await expect(shortcutDialog).toBeVisible();
    await expectVisibleKeyboardFocus(shortcutDialog.getByRole("button"));
    await page.keyboard.press("Escape");
    await expect(shortcutDialog).toBeHidden();
    await expectVisibleKeyboardFocus(shortcutOpener);
  });

  test("auth mode and fields retain visible focus through keyboard traversal", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/login");
    const loginMode = page.locator(".login-mode-switch button").first();
    await loginMode.focus();
    await expectVisibleKeyboardFocus(loginMode);
    await page.keyboard.press("Tab");
    await expectVisibleKeyboardFocus(page.locator(".login-mode-switch button").nth(1));
    await page.keyboard.press("Tab");
    await expectVisibleKeyboardFocus(page.locator("#email"));
    await page.keyboard.press("Tab");
    await expectVisibleKeyboardFocus(page.locator("#password"));
    await page.keyboard.press("Tab");
    await expectVisibleKeyboardFocus(page.locator(".login-password-toggle"));
  });
});

for (const viewport of [
  { width: 375, height: 812 },
  { width: 1440, height: 900 },
]) {
  test.describe(`reduced motion at ${viewport.width}px`, () => {
    test.use({ reducedMotion: "reduce", serviceWorkers: "block", viewport });

    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem("lang", "en");
        localStorage.setItem("nhb-pwa-install-dismissed-until", String(Date.now() + 86_400_000));
      });
      await mockPublicApi(page);
    });

    test("non-essential motion is effectively disabled", async ({ page }) => {
      expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
      for (const path of ["/", "/gallery", "/login"]) {
        await page.goto(path);
        await settleRoute(page);
        await expectMotionDisabled(page, path);
        if (path === "/gallery") {
          const rotor = page.locator(".photo-wall-3d-rotor");
          await rotor.scrollIntoViewIfNeeded();
          await page.waitForTimeout(100);
          const before = await rotor.evaluate((element) => getComputedStyle(element).transform);
          await page.waitForTimeout(200);
          const after = await rotor.evaluate((element) => getComputedStyle(element).transform);
          expect(after).toBe(before);
        }
      }

      if (viewport.width <= 980) {
        await page.goto("/");
        await page.locator(".hamburger").click();
        await expect(page.locator("#site-navigation-menu")).toBeVisible();
        await expectMotionDisabled(page, "/ drawer");
      }
    });
  });
}

// Keep the parser covered in Node as well as in the browser-side audit.
test("duration parser handles CSS seconds and milliseconds", () => {
  expect(durationToMilliseconds("0.01ms")).toBe(0.01);
  expect(durationToMilliseconds("0.2s")).toBe(200);
});
