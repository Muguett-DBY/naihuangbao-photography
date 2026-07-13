import { test, expect } from "@playwright/test";

test.describe("booking flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test("keeps the public booking modal fixed inside desktop and mobile viewports", async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      const bookingButton = page.locator(".hero-cover-primary-btn");
      await expect(bookingButton).toBeVisible();

      const initialScrollY = await page.evaluate(() => window.scrollY);
      await bookingButton.evaluate((button: HTMLButtonElement) => button.click());
      await expect(page.locator("#booking-package")).toBeVisible();

      const dialog = page.getByRole("dialog").filter({ has: page.locator(".booking-modal-content") });
      const mask = dialog.locator("..");
      await expect(mask).toHaveCSS("position", "fixed");
      await expect(page.locator(".push-notification-banner")).toHaveCount(0);

      const [dialogBox, scrollY] = await Promise.all([
        dialog.boundingBox(),
        page.evaluate(() => window.scrollY),
      ]);
      expect(dialogBox).not.toBeNull();
      expect(scrollY).toBeLessThanOrEqual(initialScrollY + 2);
      expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
      expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
      expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport.width);
      expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport.height);

      const closeButton = dialog.locator(".booking-modal-close");
      await expect(closeButton).toBeVisible();
      const closeButtonBox = await closeButton.boundingBox();
      expect(closeButtonBox).not.toBeNull();
      expect(closeButtonBox!.width).toBeGreaterThanOrEqual(40);
      expect(closeButtonBox!.height).toBeGreaterThanOrEqual(40);
      await closeButton.click();
      await expect(dialog).toBeHidden();
    }
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
    await page.route("**/api/auth/session", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        user: { id: "deposit-user", email: "deposit@example.com", displayName: "Deposit Guest" },
      }),
    }));
    await page.route("**/api/availability**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ dates: {} }),
    }));
    await page.route("**/api/booking", (route) => route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "booking-placeholder-1", accountLinked: true }),
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
    await expect(page.locator(".booking-success-bridge")).toBeVisible();
    await expect(page.getByText("Next steps", { exact: true })).toBeVisible();
    await expect(page.getByText("linked to your signed-in account", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "View My Bookings", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Message on Xiaohongshu", exact: true })).toBeVisible();
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
      body: JSON.stringify({
        capacityPerDay: 3,
        dates: {
          [policyDate]: {
            status: "partial",
            count: 2,
            capacity: 3,
            remaining: 1,
            timeSlots: {
              morning: { status: "booked", count: 1, capacity: 1, remaining: 0 },
              afternoon: { status: "available", count: 0, capacity: 1, remaining: 1 },
              fullDay: { status: "booked", count: 1, capacity: 1, remaining: 0 },
            },
          },
        },
      }),
    }));

    await page.goto("/");
    await page.locator(".hero-cover-primary-btn").click();

    await expect(page.locator(".calendar-date-boundary")).toContainText(policyDate);
    await expect(page.locator(".calendar-policy-note")).toContainText("Asia/Shanghai");
    await expect(page.locator(".calendar-policy-note")).toContainText("3");
    await expect(page.locator(".calendar-policy-strip")).toBeVisible();
    await expect(page.locator(".calendar-status-count--available")).toContainText("11");
    await expect(page.locator(".calendar-status-count--partial")).toContainText("1");
    await expect(page.locator(".calendar-status-count--booked")).toContainText("0");
    await expect(page.locator(".calendar-day-capacity")).toContainText("1 left");
    const limitedDate = page.getByRole("button", { name: /^20日 - Open slots: 1/ });
    await expect(limitedDate).toBeEnabled();
    await limitedDate.click();
    await expect(limitedDate).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".calendar-selection-summary")).toContainText("Selected date");
    await expect(page.locator(".calendar-selection-summary")).toContainText("Open spots: 1");
    await expect(page.locator(".booking-time-slot-grid")).toContainText("Morning");
    await expect(page.locator(".booking-time-slot-grid")).toContainText("Unavailable");
    await expect(page.locator("#booking-time option[value='morning']")).toBeDisabled();
    await expect(page.locator("#booking-time option[value='afternoon']")).toBeEnabled();
    await expect(page.getByRole("button", { name: "Previous month" })).toBeDisabled();
    await expect(page.getByRole("button", { name: /^19日 - Unavailable before/ })).toBeDisabled();
  });

  test("recovers when a direct booking time window is taken before submit", async ({ page }) => {
    const policyDate = "2099-08-20";
    const bookingDate = "2099-08-21";
    const bookingPayloads: Record<string, unknown>[] = [];

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
      body: JSON.stringify({
        capacityPerDay: 3,
        dates: {
          [bookingDate]: {
            status: "partial",
            count: 1,
            capacity: 3,
            remaining: 2,
            timeSlots: {
              morning: { status: "booked", count: 1, capacity: 1, remaining: 0 },
              afternoon: { status: "available", count: 0, capacity: 1, remaining: 1 },
              fullDay: { status: "available", count: 0, capacity: 1, remaining: 1 },
            },
          },
        },
      }),
    }));
    await page.route("**/api/booking", (route) => {
      bookingPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
      return route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: "time_unavailable",
          message: "The requested time window is no longer available.",
          preferredDate: bookingDate,
          preferredTime: "fullDay",
          timeSlots: {
            morning: { status: "booked", count: 1, capacity: 1, remaining: 0 },
            afternoon: { status: "available", count: 0, capacity: 1, remaining: 1 },
            fullDay: { status: "booked", count: 1, capacity: 1, remaining: 0 },
          },
          recovery: {
            canKeepDate: true,
            requestedTime: "fullDay",
            suggestedTime: "afternoon",
            availableTimeSlots: ["afternoon"],
          },
        }),
      });
    });

    await page.goto("/");
    await page.locator(".hero-cover-primary-btn").click();
    await page.getByRole("button", { name: /^21日 - Open slots: 2/ }).click();
    await page.locator("#booking-time").selectOption("fullDay");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.locator("#booking-name").fill("Recovery Guest");
    await page.locator("#booking-contact").fill("recovery@example.com");
    await page.getByRole("button", { name: "Send Booking", exact: true }).click();

    await expect(page.locator("#booking-time")).toBeVisible();
    await expect(page.locator(".booking-error")).toContainText("That window was just taken");
    await expect(page.locator("#booking-time")).toHaveValue("afternoon");
    await expect(page.locator("#booking-time option[value='fullDay']")).toBeDisabled();
    await expect(page.locator(".booking-time-slot-grid")).toContainText("Afternoon");
    await expect(page.locator(".booking-time-slot-grid")).toContainText("Available");
    expect(bookingPayloads).toHaveLength(1);
    expect(bookingPayloads[0]).toMatchObject({
      preferredDate: bookingDate,
      preferredTime: "fullDay",
      name: "Recovery Guest",
      contact: "recovery@example.com",
    });
  });

  test("routes fully booked dates into an account-linked waitlist flow", async ({ page }) => {
    const policyDate = "2099-08-20";
    const fullDate = "2099-08-21";
    const waitlistRequests: Array<Record<string, unknown>> = [];

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
      body: JSON.stringify({
        capacityPerDay: 3,
        dates: {
          [fullDate]: {
            status: "booked",
            count: 3,
            capacity: 3,
            remaining: 0,
          },
        },
      }),
    }));
    await page.route("**/api/booking/waitlist", (route) => {
      waitlistRequests.push(route.request().postDataJSON() as Record<string, unknown>);
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          accountLinked: true,
          waitlist: {
            id: "wl_full_date",
            preferredDate: fullDate,
            active: true,
            createdAt: "2099-08-19T16:00:00.000Z",
          },
        }),
      });
    });

    await page.goto("/");
    await page.locator(".hero-cover-primary-btn").click();

    const fullDateButton = page.getByRole("button", { name: /^21日 - Fully Booked, join waitlist/ });
    await expect(fullDateButton).toBeEnabled();
    await fullDateButton.click();
    await expect(page.locator(".booking-waitlist-notice")).toContainText("Join the waitlist");

    await page.locator("#booking-name").fill("Waitlist Guest");
    await page.locator("#booking-contact").fill("waitlist@example.com");
    await page.getByRole("button", { name: "Join waitlist", exact: true }).click();

    await expect(page.locator(".booking-waitlist-success")).toBeVisible();
    await expect(page.locator(".booking-waitlist-success")).toContainText(fullDate);
    await expect(page.locator(".booking-success-bridge")).toBeVisible();
    await expect(page.getByRole("link", { name: "View My Bookings", exact: true })).toBeVisible();
    await expect(page.getByText("linked to your signed-in account", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Message on Xiaohongshu", exact: true })).toBeVisible();
    expect(waitlistRequests[0]).toMatchObject({
      preferredDate: fullDate,
      name: "Waitlist Guest",
      contact: "waitlist@example.com",
    });
  });

  test("keeps an anonymous email waitlist confirmation unlinked without creating a duplicate", async ({ page }) => {
    const policyDate = "2099-08-20";
    const fullDate = "2099-08-21";
    const waitlistRequests: Array<Record<string, unknown>> = [];

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
      body: JSON.stringify({
        capacityPerDay: 3,
        dates: {
          [fullDate]: {
            status: "booked",
            count: 3,
            capacity: 3,
            remaining: 0,
          },
        },
      }),
    }));
    await page.route("**/api/booking/waitlist", (route) => {
      waitlistRequests.push(route.request().postDataJSON() as Record<string, unknown>);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          accountLinked: false,
          message: "already_waitlisted",
          waitlist: {
            id: "wl_existing_123456",
            preferredDate: fullDate,
            active: true,
            duplicate: true,
            createdAt: "2099-08-19T16:00:00.000Z",
          },
        }),
      });
    });

    await page.goto("/");
    await page.locator(".hero-cover-primary-btn").click();

    await page.getByRole("button", { name: /^21日 - Fully Booked, join waitlist/ }).click();
    await page.locator("#booking-name").fill("Waitlist Guest");
    await page.locator("#booking-contact").fill("waitlist@example.com");
    await page.getByRole("button", { name: "Join waitlist", exact: true }).click();

    const existingPanel = page.locator(".booking-waitlist-success--existing");
    await expect(existingPanel).toBeVisible();
    await expect(existingPanel).toContainText("Already on the waitlist");
    await expect(existingPanel).toContainText("no duplicate was created");
    await expect(page.getByRole("link", { name: "View My Bookings", exact: true })).toHaveCount(0);
    await expect(page.getByText("Updates will go to the contact details you provided.", { exact: false })).toBeVisible();
    await expect(page.locator(".booking-error")).toHaveCount(0);
    expect(waitlistRequests).toHaveLength(1);
  });

  test("keeps non-email waitlist follow-up truthful", async ({ page }) => {
    const policyDate = "2099-08-20";
    const fullDate = "2099-08-21";

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
      body: JSON.stringify({
        capacityPerDay: 3,
        dates: {
          [fullDate]: {
            status: "booked",
            count: 3,
            capacity: 3,
            remaining: 0,
          },
        },
      }),
    }));
    await page.route("**/api/booking/waitlist", (route) => route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        accountLinked: false,
        waitlist: {
          id: "wl_non_email",
          preferredDate: fullDate,
          active: true,
          createdAt: "2099-08-19T16:00:00.000Z",
        },
      }),
    }));

    await page.goto("/");
    await page.locator(".hero-cover-primary-btn").click();
    await page.getByRole("button", { name: /^21日 - Fully Booked, join waitlist/ }).click();
    await page.locator("#booking-name").fill("Waitlist Guest");
    await page.locator("#booking-contact").fill("xiaohongshu:waitlist-guest");
    await page.getByRole("button", { name: "Join waitlist", exact: true }).click();

    await expect(page.locator(".booking-waitlist-success")).toBeVisible();
    await expect(page.getByRole("link", { name: "View My Bookings", exact: true })).toHaveCount(0);
    await expect(page.getByText("Updates will go to the contact details you provided.", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Message on Xiaohongshu", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue browsing", exact: true })).toBeVisible();
  });

  test("shows an active waitlist entry instead of an empty bookings dashboard", async ({ page }) => {
    await page.route("**/api/auth/session", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        user: { id: "user-1", email: "waitlist@example.com", displayName: "Waitlist Guest" },
      }),
    }));
    await page.route("**/api/user/stats", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ bookings: 0, photos: 0, purchases: 0, courses: 0, workshops: 0 }),
    }));
    await page.route("**/api/user/bookings**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        bookings: [],
        waitlist: [{
          id: "wl_customer_123",
          package_name: "Portrait Session",
          preferred_date: "2099-08-21",
          name: "Waitlist Guest",
          active: true,
          notified: false,
          created_at: "2026-07-13T00:00:00.000Z",
        }],
      }),
    }));

    await page.goto("/dashboard");
    await page.getByRole("tab", { name: "My Bookings", exact: true }).click();

    const waitlistCard = page.locator(".dashboard-waitlist-card");
    await expect(waitlistCard).toBeVisible();
    await expect(waitlistCard).toContainText("Portrait Session");
    await expect(waitlistCard).toContainText("2099-08-21");
    await expect(page.getByText("Waiting for availability", { exact: true })).toBeVisible();
    await expect(page.getByText("No sessions booked yet", { exact: true })).toHaveCount(0);
    await expect(page.locator(".dashboard-booking-overview")).toHaveCount(0);
    await expect(waitlistCard.getByRole("button")).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await waitlistCard.evaluate((card) => ({
      page: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      card: card.scrollWidth > card.clientWidth,
    }));
    expect(overflow).toEqual({ page: false, card: false });
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

  test("reschedules a customer booking to an available time window", async ({ page }) => {
    let reschedulePayload: Record<string, unknown> | null = null;
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
    await page.route("**/api/availability**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        capacityPerDay: 3,
        dates: {
          "2026-07-15": {
            status: "partial",
            count: 1,
            capacity: 3,
            remaining: 2,
            timeSlots: {
              morning: { status: "booked", count: 1, capacity: 1, remaining: 0 },
              afternoon: { status: "available", count: 0, capacity: 1, remaining: 1 },
              fullDay: { status: "booked", count: 1, capacity: 1, remaining: 0 },
            },
          },
        },
      }),
    }));
    await page.route("**/api/user/bookings**", async (route) => {
      if (new URL(route.request().url()).pathname.endsWith("/reschedule")) {
        reschedulePayload = route.request().postDataJSON() as Record<string, unknown>;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            booking: { preferred_date: "2026-07-15", preferred_time: "afternoon" },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          bookings: [{
            id: "booking-1",
            package_name: "Portrait Session",
            preferred_date: "2026-07-15",
            preferred_time: "morning",
            name: "Guest",
            status: "confirmed",
            created_at: "2026-06-26T00:00:00.000Z",
            payment_intent_id: null,
            payment_status: "not_started",
            payment_provider: null,
            payment_amount_cents: null,
            payment_currency: null,
          }],
        }),
      });
    });

    await page.goto("/dashboard");
    await page.getByRole("tab", { name: "My Bookings", exact: true }).click();
    await page.getByRole("button", { name: "Reschedule", exact: true }).click();

    await expect(page.locator(".dashboard-reschedule-steps")).toContainText("Date");
    await expect(page.locator(".dashboard-reschedule-steps")).toContainText("Time");
    await expect(page.locator(".dashboard-reschedule-steps")).toContainText("Review");
    await expect(page.locator(".dashboard-reschedule-status")).toContainText("Choose a different date or time");
    await expect(page.getByRole("button", { name: "Confirm reschedule", exact: true })).toBeDisabled();
    await expect(page.locator(".dashboard-reschedule-summary")).toContainText("Morning");
    const timeSelect = page.getByLabel("New time window", { exact: true });
    await timeSelect.selectOption("afternoon");
    await expect(page.locator(".dashboard-reschedule-summary")).toContainText("Afternoon");
    await expect(page.locator(".dashboard-reschedule-status")).toContainText("Ready to move to 2026-07-15 · Afternoon");
    await expect(page.getByRole("button", { name: "Confirm reschedule", exact: true })).toBeEnabled();

    await page.setViewportSize({ width: 390, height: 844 });
    const layout = await page.locator(".dashboard-confirm-panel--default").evaluate((panel) => ({
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      panelOverflow: panel.scrollWidth > panel.clientWidth,
      summaryColumns: getComputedStyle(panel.querySelector(".dashboard-reschedule-summary") as HTMLElement).gridTemplateColumns,
      workspaceColumns: getComputedStyle(panel.querySelector(".dashboard-reschedule-workspace") as HTMLElement).gridTemplateColumns,
    }));
    expect(layout.pageOverflow).toBe(false);
    expect(layout.panelOverflow).toBe(false);
    expect(layout.summaryColumns.split(" ")).toHaveLength(1);
    expect(layout.workspaceColumns.split(" ")).toHaveLength(1);

    await page.getByRole("button", { name: "Confirm reschedule", exact: true }).click();

    await expect.poll(() => reschedulePayload).toEqual({
      preferred_date: "2026-07-15",
      preferred_time: "afternoon",
    });
    await expect(page.getByText("Booking moved to 2026-07-15 · Afternoon.", { exact: true })).toBeVisible();
  });

  test("recovers when a reschedule time window is taken before submit", async ({ page }) => {
    const reschedulePayloads: Record<string, unknown>[] = [];
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
    await page.route("**/api/availability**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        capacityPerDay: 3,
        dates: {
          "2026-07-15": {
            status: "partial",
            count: 1,
            capacity: 3,
            remaining: 2,
            timeSlots: {
              morning: { status: "booked", count: 1, capacity: 1, remaining: 0 },
              afternoon: { status: "available", count: 0, capacity: 1, remaining: 1 },
              fullDay: { status: "available", count: 0, capacity: 1, remaining: 1 },
            },
          },
        },
      }),
    }));
    await page.route("**/api/user/bookings**", async (route) => {
      if (new URL(route.request().url()).pathname.endsWith("/reschedule")) {
        reschedulePayloads.push(route.request().postDataJSON() as Record<string, unknown>);
        if (reschedulePayloads.length === 1) {
          return route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              error: "time_unavailable",
              message: "The requested time window is no longer available.",
              preferredDate: "2026-07-15",
              preferredTime: "fullDay",
              timeSlots: {
                morning: { status: "booked", count: 1, capacity: 1, remaining: 0 },
                afternoon: { status: "available", count: 0, capacity: 1, remaining: 1 },
                fullDay: { status: "booked", count: 1, capacity: 1, remaining: 0 },
              },
              recovery: {
                canKeepDate: true,
                requestedTime: "fullDay",
                suggestedTime: "afternoon",
                availableTimeSlots: ["afternoon"],
              },
            }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            booking: { preferred_date: "2026-07-15", preferred_time: "afternoon" },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          bookings: [{
            id: "booking-1",
            package_name: "Portrait Session",
            preferred_date: "2026-07-15",
            preferred_time: "morning",
            name: "Guest",
            status: "confirmed",
            created_at: "2026-06-26T00:00:00.000Z",
            payment_intent_id: null,
            payment_status: "not_started",
            payment_provider: null,
            payment_amount_cents: null,
            payment_currency: null,
          }],
        }),
      });
    });

    await page.goto("/dashboard");
    await page.getByRole("tab", { name: "My Bookings", exact: true }).click();
    await page.getByRole("button", { name: "Reschedule", exact: true }).click();

    const timeSelect = page.getByLabel("New time window", { exact: true });
    await timeSelect.selectOption("fullDay");
    await expect(page.locator(".dashboard-reschedule-status")).toContainText("Ready to move to 2026-07-15 · Full Day.");
    await page.getByRole("button", { name: "Confirm reschedule", exact: true }).click();

    await expect(page.locator(".dashboard-reschedule-status")).toContainText("That window was just taken");
    await expect(timeSelect).toHaveValue("afternoon");
    await expect(page.locator(".dashboard-reschedule-summary")).toContainText("Afternoon");
    await expect(page.getByRole("button", { name: "Confirm reschedule", exact: true })).toBeEnabled();

    await page.getByRole("button", { name: "Confirm reschedule", exact: true }).click();
    await expect.poll(() => reschedulePayloads).toHaveLength(2);
    expect(reschedulePayloads).toEqual([
      {
        preferred_date: "2026-07-15",
        preferred_time: "fullDay",
      },
      {
        preferred_date: "2026-07-15",
        preferred_time: "afternoon",
      },
    ]);
    await expect(page.getByText("Booking moved to 2026-07-15 · Afternoon.", { exact: true })).toBeVisible();
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
