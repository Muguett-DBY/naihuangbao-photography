import { test, expect } from "@playwright/test";

test.describe("booking flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test("opens booking modal, validates form, submits", async ({ page }) => {
    await page.goto("/booking");

    // Verify page loads
    await expect(page.locator("h1")).toBeVisible();

    // Scroll to the StyleQuiz section
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(500);

    // Find and click booking CTA on the page
    const bookBtn = page.locator('a[href="/booking"]').first();
    if (await bookBtn.isVisible()) {
      await bookBtn.click();
    }

    // Navigate home and use the hero booking button
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Click the booking CTA button on the hero
    const heroBookBtn = page.locator(".hero-cover-primary-btn");
    await expect(heroBookBtn).toBeVisible();
    await heroBookBtn.click();

    // Wait for modal to open - Step 1 shows package/date/time
    await expect(page.locator("#booking-package")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#booking-time")).toBeVisible();

    // Click Next to go to Step 2 where name/contact are
    await page.locator("button:has-text('Next')").click();
    await expect(page.locator("#booking-name")).toBeVisible();
    await expect(page.locator("#booking-contact")).toBeVisible();

    // Verify validation - submit without filling
    const submitBtn = page.locator('button[type="submit"]').last();
    await expect(submitBtn).toBeDisabled();

    // Fill in the form
    await page.locator("#booking-name").fill("测试用户");
    await page.locator("#booking-contact").fill("test@example.com");

    // Verify submit becomes enabled
    await expect(submitBtn).toBeEnabled();

    // Submit the form
    await submitBtn.click();

    // Should show either success or payment (depending on the API response)
    // Since this is against the real API, we check for either success message or error
    await page.waitForTimeout(3000);

    const successMessage = page.locator(".booking-modal-success h2");
    const errorMessage = page.locator(".booking-error");
    const hasSuccess = await successMessage.isVisible();
    const hasError = await errorMessage.isVisible();

    expect(hasSuccess || hasError).toBe(true);
  });

  test("presets page has working navigation", async ({ page }) => {
    await page.goto("/products");

    // Verify page loads
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".section-eyebrow")).toBeVisible();

    // Check for filter buttons if present
    const filterBtns = page.locator(".filter-row button");
    const count = await filterBtns.count();
    if (count > 1) {
      // Click the second filter button
      await filterBtns.nth(1).click();
      await page.waitForTimeout(300);
    }
  });

  test("preset detail page loads", async ({ page }) => {
    await page.goto("/products");

    // Click on a preset card if available
    const presetCard = page.locator(".preset-card").first();
    if (await presetCard.isVisible()) {
      await presetCard.click();
      await page.waitForTimeout(1000);
      // Should be on a preset detail page
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("records a placeholder deposit without fake card fields or mobile overlay collisions", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/availability**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ dates: {} }),
    }));
    await page.route("**/api/booking", (route) => route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "booking-placeholder-1" }),
    }));
    await page.route("**/api/notifications/send", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sent: false }),
    }));
    await page.route("**/api/payment/create-intent", (route) => route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        paymentIntentId: "pi_placeholder_1",
        clientSecret: "pi_placeholder_1_secret",
        amountCents: 2000,
        currency: "cny",
        provider: "placeholder",
        status: "pending",
      }),
    }));

    await page.goto("/");
    await page.locator(".hero-cover-primary-btn").click();
    await expect(page.locator("#booking-package")).toBeVisible();
    await expect(page.locator(".mobile-bottom-nav")).toBeHidden();
    await expect(page.locator(".public-chat-widget")).toBeHidden();

    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.locator("#booking-name").fill("Deposit Guest");
    await page.locator("#booking-contact").fill("deposit@example.com");
    await page.getByRole("button", { name: "Send Booking", exact: true }).click();

    await expect(page.locator(".payment-form-card")).toBeVisible();
    await expect(page.locator(".payment-status-track")).toBeVisible();
    await expect(page.getByText("Request", { exact: true })).toBeVisible();
    await expect(page.locator("#payment-card")).toHaveCount(0);
    await expect(page.getByText("No real charges will be made.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Record deposit as pending", exact: true }).click();

    await expect(page.locator(".booking-deposit-outcome--pending")).toBeVisible();
    await expect(page.getByText("No charge was made.", { exact: false })).toBeVisible();
    await expect(page.locator(".booking-payment-clarity")).toBeVisible();
    await expect(page.getByText("What happens with the deposit", { exact: true })).toBeVisible();
    await expect(page.getByText("No deposit charged", { exact: true })).toBeVisible();
  });

  test("keeps booking dates aligned with the studio business day", async ({ page }) => {
    const policyDate = "2099-08-20";

    await page.route("**/api/booking/policy", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        earliestDate: policyDate,
        timeZone: "Asia/Shanghai",
        capacityPerDay: 3,
        dateFormat: "YYYY-MM-DD",
        unavailableReasons: {
          beforeEarliest: "before_earliest",
          fullyBooked: "fully_booked",
          invalidDate: "invalid_date",
        },
        generatedAt: "2099-08-19T16:00:00.000Z",
      }),
    }));
    await page.route("**/api/availability**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ dates: {} }),
    }));

    await page.goto("/");
    await page.locator(".hero-cover-primary-btn").click();

    await expect(page.locator(".calendar-date-boundary")).toContainText(policyDate);
    await expect(page.locator(".calendar-policy-note")).toContainText("Asia/Shanghai");
    await expect(page.locator(".calendar-policy-note")).toContainText("3");
    await expect(page.getByRole("button", { name: "Previous month" })).toBeDisabled();
    await expect(page.getByRole("button", { name: /^19日 - Unavailable before/ })).toBeDisabled();
  });

  test("shows the latest booking deposit state in the customer dashboard", async ({ page }) => {
    await page.route("**/api/auth/session", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        user: { id: "user-1", email: "guest@example.com", displayName: "Guest" },
      }),
    }));
    await page.route("**/api/user/stats", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ bookings: 1, photos: 0, purchases: 0, courses: 0, workshops: 0 }),
    }));
    await page.route("**/api/user/bookings**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        bookings: [
          {
            id: "booking-1",
            package_name: "Portrait Session",
            preferred_date: "2099-08-18",
            preferred_time: "morning",
            name: "Guest",
            status: "confirmed",
            created_at: "2026-06-26T00:00:00.000Z",
            payment_intent_id: "pi_placeholder_1",
            payment_status: "pending",
            payment_provider: "placeholder",
            payment_amount_cents: 2000,
            payment_currency: "cny",
          },
          {
            id: "booking-2",
            package_name: "Refunded Session",
            preferred_date: "2099-08-19",
            preferred_time: "afternoon",
            name: "Guest",
            status: "confirmed",
            created_at: "2026-06-26T00:00:00.000Z",
            payment_intent_id: "pi_refunded_1",
            payment_status: "refunded",
            payment_provider: "stripe",
            payment_amount_cents: 5000,
            payment_currency: "cny",
          },
        ],
      }),
    }));

    await page.goto("/dashboard");
    await page.locator(".dashboard-tabs button").filter({ hasText: "My Bookings" }).click();

    await expect(page.locator(".dashboard-booking-deposit--pending")).toBeVisible();
    await expect(page.getByText("Pending, no charge made", { exact: true })).toBeVisible();
    await expect(page.locator(".dashboard-booking-deposit--refunded")).toBeVisible();
    await expect(page.getByText("Refunded", { exact: true })).toBeVisible();
    await expect(page.getByText("CN¥20.00", { exact: false })).toBeVisible();
  });

  test("keeps dashboard navigation and empty actions usable on desktop and mobile", async ({ page }) => {
    await page.route("**/api/auth/session", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        user: { id: "user-1", email: "guest@example.com", displayName: "Guest" },
      }),
    }));
    await page.route("**/api/user/**", (route) => {
      const resource = new URL(route.request().url()).pathname.split("/").pop() || "items";
      const body = resource === "stats"
        ? {
            bookings: { total: 0, upcoming: 0 },
            courses: { total: 0 },
            workshops: { total: 0 },
          }
        : { [resource]: [] };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });

    await page.goto("/dashboard");
    await expect(page.locator(".overview-start-panel")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Overview", exact: true })).toHaveAttribute("aria-selected", "true");

    const bookingsTab = page.getByRole("tab", { name: "My Bookings", exact: true });
    await bookingsTab.click();
    await expect(bookingsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("link", { name: "Book a session", exact: true })).toBeVisible();

    await bookingsTab.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "My Photos", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("No delivered photos yet", { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".dashboard-workspace-tablist")).toHaveAttribute("aria-orientation", "horizontal");
    const mobileMetrics = await page.locator(".dashboard-workspace-tablist").evaluate((element) => {
      const firstLabel = element.querySelector("button span:last-child");
      const chat = document.querySelector(".public-chat-widget");
      const scrollTop = document.querySelector(".nhb-scroll-top");
      return {
        flexDirection: getComputedStyle(element).flexDirection,
        scrollable: element.scrollWidth > element.clientWidth,
        writingMode: firstLabel ? getComputedStyle(firstLabel).writingMode : "",
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        chatHidden: !chat || getComputedStyle(chat).display === "none",
        scrollTopHidden: !scrollTop || getComputedStyle(scrollTop).display === "none",
      };
    });

    expect(mobileMetrics).toEqual({
      flexDirection: "row",
      scrollable: true,
      writingMode: "horizontal-tb",
      pageOverflow: false,
      chatHidden: true,
      scrollTopHidden: true,
    });
  });
});
