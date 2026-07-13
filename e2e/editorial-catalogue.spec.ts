import { expect, test, type Page } from "@playwright/test";

const course = {
  id: "course-1",
  title: "南京人像光线入门",
  description: "从城市街巷与园林光线开始，建立稳定的人像观察方法。",
  cover_image_url: "/images/gallery/gallery-garden-01.webp",
  category: "beginner",
  difficulty: "beginner",
  duration_minutes: 95,
  price_cents: 39900,
  price_display: "¥399",
  currency: "CNY",
  sort_order: 1,
  published: 1,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

const courses = [
  course,
  {
    ...course,
    id: "course-2",
    title: "自然姿态与叙事",
    cover_image_url: "/images/gallery/gallery-daily-01.webp",
    category: "posing",
    difficulty: "intermediate",
    sort_order: 2,
  },
];

const preset = {
  id: "preset-1",
  name: "城墙暮色",
  description: "保留肤色与空气感的低饱和城市色调。",
  category: "lightroom",
  preview_images: [
    "/images/gallery/gallery-urban-01.webp",
    "/images/gallery/gallery-garden-01.webp",
  ],
  download_url: "/downloads/city-wall-dusk.zip",
  price_display: "¥89",
  featured: 1,
  download_count: 128,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

const presets = [
  preset,
  {
    ...preset,
    id: "preset-2",
    name: "园林晨雾",
    category: "luts",
    preview_images: [
      "/images/gallery/gallery-jiangnan-01.webp",
      "/images/gallery/gallery-daily-01.webp",
    ],
    featured: 0,
  },
];

const workshop = {
  id: "workshop-1",
  title: "玄武湖晨光外拍",
  description: "以湖岸晨光完成一组有环境层次的人像练习。",
  cover_image_url: "/images/gallery/gallery-jiangnan-01.webp",
  event_date: "2099-08-18",
  event_time: "07:00",
  location: "南京玄武湖",
  max_participants: 8,
  current_participants: 3,
  price_cents: 69900,
  price_display: "¥699",
  currency: "CNY",
  status: "upcoming",
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

const workshops = [
  workshop,
  {
    ...workshop,
    id: "workshop-2",
    title: "老门东夜景练习",
    cover_image_url: "/images/gallery/gallery-urban-01.webp",
    event_date: "2099-09-03",
    event_time: "18:30",
    max_participants: 6,
    current_participants: 6,
  },
  {
    ...workshop,
    id: "workshop-3",
    title: "颐和路环境人像",
    cover_image_url: "/images/gallery/gallery-daily-01.webp",
    event_date: "2099-10-12",
    max_participants: 10,
    current_participants: 4,
  },
];

const merchandise = {
  id: "item-1",
  name: "南京影像手工相册",
  description: "适合收纳一次完整拍摄故事的布面相册。",
  images: [
    "/images/gallery/gallery-daily-01.webp",
    "/images/gallery/gallery-garden-01.webp",
  ],
  category: "album",
  price_display: "¥299",
  available: 1,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

const merchandiseItems = [
  merchandise,
  {
    ...merchandise,
    id: "item-2",
    name: "原木桌面相框",
    category: "frame",
    images: ["/images/gallery/gallery-urban-01.webp"],
  },
];

async function fulfillJson(route: Parameters<Parameters<Page["route"]>[1]>[0], body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockCatalogueApi(page: Page) {
  await page.route("**/api/auth/session", (route) => fulfillJson(route, { authenticated: false, user: null }));
  await page.route("**/api/courses/course-1", (route) => fulfillJson(route, {
    course,
    modules: [
      { id: "module-1", course_id: course.id, title: "观察环境光", type: "text", content: "从方向、反差和色温开始。", sort_order: 1 },
      { id: "module-2", course_id: course.id, title: "组织人物与背景", type: "video", content: "建立画面层次。", sort_order: 2 },
    ],
  }));
  await page.route("**/api/courses", (route) => fulfillJson(route, { courses }));
  await page.route("**/api/presets/preset-1", (route) => fulfillJson(route, { preset }));
  await page.route("**/api/presets", (route) => fulfillJson(route, { presets }));
  await page.route("**/api/workshops/workshop-1", (route) => fulfillJson(route, { workshop }));
  await page.route("**/api/workshops", (route) => fulfillJson(route, { workshops }));
  await page.route("**/api/merchandise/item-1", (route) => fulfillJson(route, { merchandise }));
  await page.route("**/api/merchandise/item-2", (route) => fulfillJson(route, {
    merchandise: merchandiseItems[1],
  }));
  await page.route("**/api/merchandise", (route) => fulfillJson(route, { merchandise: merchandiseItems }));
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }))).toEqual(expect.objectContaining({
    document: expect.any(Number),
    viewport: expect.any(Number),
  }));

  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
}

test.describe("editorial catalogue routes", () => {
  test.use({ serviceWorkers: "block" });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await mockCatalogueApi(page);
  });

  test("all catalogue indexes render API entries inside image-led editorial shells", async ({ page }) => {
    const routes = [
      { path: "/courses", grid: ".courses-grid", cards: 2, issue: "ISSUE 03" },
      { path: "/products", grid: ".presets-grid", cards: 2, issue: "ISSUE 04" },
      { path: "/workshops", grid: ".workshops-grid", cards: 3, issue: "ISSUE 05" },
      { path: "/shop", grid: ".merchandise-grid", cards: 2, issue: "ISSUE 06" },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.locator(`${route.grid} .catalogue-card`)).toHaveCount(route.cards);
      await expect(page.locator(".page-hero-media img")).toBeVisible();
      await expect(page.locator(".page-hero-issue")).toHaveText(route.issue);
      await expect(page.locator("h1")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("mobile workshop filtering stays above the persistent nav and applies normally", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/workshops");
    await expect(page.locator(".workshop-card")).toHaveCount(3);

    await page.locator(".workshop-filter-mobile-btn").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: /close|关闭|閉じる|닫기/i })).toBeFocused();

    const layers = await page.evaluate(() => ({
      filter: Number.parseInt(getComputedStyle(document.querySelector<HTMLElement>(".workshop-filter-overlay")!).zIndex, 10),
      nav: Number.parseInt(getComputedStyle(document.querySelector<HTMLElement>(".mobile-bottom-nav")!).zIndex, 10),
    }));
    expect(layers.filter).toBeGreaterThan(layers.nav);

    await dialog.locator("select").selectOption("full");
    await dialog.locator(".catalogue-primary-button").click();
    await expect(dialog).toBeHidden();
    await expect(page.locator(".workshop-filter-mobile-btn")).toBeFocused();
    await expect(page.locator(".workshop-card")).toHaveCount(1);
    await expect(page.locator(".workshop-card h3")).toHaveText("老门东夜景练习");
    await expectNoHorizontalOverflow(page);
  });

  test("catalogue errors expose a working retry path", async ({ page }) => {
    let attempts = 0;
    await page.route("**/api/courses", async (route) => {
      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "temporarily unavailable" }),
        });
        return;
      }
      await fulfillJson(route, { courses });
    });

    await page.goto("/courses");
    await expect(page.getByRole("alert")).toBeVisible();
    await page.locator(".data-state-actions button").click();
    await expect(page.locator(".courses-grid .catalogue-card")).toHaveCount(2);
    expect(attempts).toBe(2);
  });

  test("registration rechecks nested workshop capacity before posting", async ({ page }) => {
    let detailRequests = 0;
    let registrationRequests = 0;
    await page.route("**/api/workshops/workshop-1", async (route) => {
      detailRequests += 1;
      await fulfillJson(route, {
        workshop: detailRequests === 1
          ? workshop
          : { ...workshop, current_participants: workshop.max_participants },
      });
    });
    await page.route("**/api/workshops/workshop-1/register", async (route) => {
      registrationRequests += 1;
      await fulfillJson(route, { id: "registration-1" });
    });

    await page.goto("/workshops/workshop-1");
    await page.locator("#workshop-detail-name").fill("Lin");
    await page.locator("#workshop-detail-contact").fill("lin@example.com");
    await page.locator(".workshop-detail-register-card button").click();

    await expect(page.locator(".workshop-detail-form-msg")).toBeVisible();
    await expect.poll(() => detailRequests).toBe(2);
    expect(registrationRequests).toBe(0);
  });

  test("free workshop confirmation preserves registrant details and restores focus", async ({ page }) => {
    const freeWorkshop = { ...workshop, price_cents: 0, price_display: "Free" };
    await page.route("**/api/workshops/workshop-1", (route) => fulfillJson(route, {
      workshop: freeWorkshop,
    }));
    await page.route("**/api/workshops/workshop-1/register", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "registration-free-1" }),
      });
    });
    await page.route("**/api/notifications/send", (route) => fulfillJson(route, { ok: true }));

    await page.goto("/workshops/workshop-1");
    await page.locator("#workshop-detail-name").fill("Lin");
    await page.locator("#workshop-detail-contact").fill("lin@example.com");
    const submit = page.locator(".workshop-detail-register-card button");
    await submit.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Lin");
    await expect(dialog).toContainText("lin@example.com");
    await expect(dialog.locator(".workshop-confirmation-close")).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(submit).toBeFocused();
  });

  test("all detail routes keep media, summary, and primary content visible", async ({ page }) => {
    const routes = [
      { path: "/courses/course-1", title: course.title },
      { path: "/presets/preset-1", title: preset.name },
      { path: "/workshops/workshop-1", title: workshop.title },
      { path: "/shop/item-1", title: merchandise.name },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.locator(".catalogue-detail-stage")).toBeVisible();
      await expect(page.locator(".catalogue-detail-media")).toBeVisible();
      await expect(page.locator(".catalogue-detail-summary")).toBeVisible();
      await expect(page.locator("h1")).toHaveText(route.title);
      await expect(page.locator(".catalogue-detail-band").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("shop detail resets the image index when related-item navigation changes the route", async ({ page }) => {
    await page.goto("/shop/item-1");
    await page.locator(".shop-detail-nav-btn--next").click();
    await expect(page.locator(".shop-detail-main-image")).toHaveAttribute("src", merchandise.images[1]);

    await page.getByRole("link", { name: merchandiseItems[1].name }).click();

    await expect(page).toHaveURL(/\/shop\/item-2$/);
    await expect(page.locator(".shop-detail-main-image")).toHaveAttribute(
      "src",
      merchandiseItems[1].images[0],
    );
  });
});
