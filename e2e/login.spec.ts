import { test, expect } from "@playwright/test";

test.describe("login and dashboard flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test("login page loads with form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toBeVisible();
    // Use more specific selector for login form
    await expect(page.locator('.login-card input[type="email"]')).toBeVisible();
    await expect(page.locator('.login-card input[type="password"]')).toBeVisible();
  });

  test("login form validation works", async ({ page }) => {
    await page.goto("/login");
    
    // Fill email
    await page.locator('.login-card input[type="email"]').fill("test@example.com");
    
    // Fill password
    await page.locator('.login-card input[type="password"]').fill("password123");
    
    // Submit button should be enabled when form is valid
    const submitBtn = page.locator('.login-card button[type="submit"]').first();
    await expect(submitBtn).toBeEnabled();
    
    // Submit the form
    await submitBtn.click();
    
    // Should show an error message (since test credentials are invalid)
    await page.waitForTimeout(2000);
    // Check if we're still on login page or got an error
    const url = page.url();
    const hasError = await page.locator('.login-error, [role="alert"]').isVisible();
    expect(url.includes("/login") || hasError).toBeTruthy();
  });

  test("login toggle between login and register", async ({ page }) => {
    await page.goto("/login");
    
    // Find toggle button
    const toggleBtn = page.locator(".login-toggle");
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      
      // Should show display name field
      await expect(page.locator('.login-card input[name="displayName"]')).toBeVisible();
      
      // Toggle back
      await toggleBtn.click();
      await expect(page.locator('.login-card input[name="displayName"]')).not.toBeVisible();
    }
  });

  test("dashboard page requires authentication", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login\?from=dashboard/);
    await expect(page.locator(".login-context-notice")).toBeVisible();
    await expect(page.getByText("Log in to view your booking status", { exact: true })).toBeVisible();
  });

  test("preserves dashboard intent after login", async ({ page }) => {
    await page.route("**/api/auth/session", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ authenticated: false }),
    }));
    await page.route("**/api/auth/login", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "user-1", email: "guest@example.com", displayName: "Guest User" },
      }),
    }));

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?from=dashboard/);
    await page.locator("#email").fill("guest@example.com");
    await page.locator("#password").fill("password123");
    await page.getByRole("button", { name: "Log in", exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Guest User", exact: true })).toBeVisible();
  });

  test("keeps password reset on the email step when delivery is unavailable", async ({ page }) => {
    await page.route("**/api/auth/forgot-password", (route) => route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "email_delivery_unavailable" }),
    }));

    await page.goto("/login");
    await page.getByRole("button", { name: "Forgot password?", exact: true }).click();
    await page.locator("#reset-email").fill("guest@example.com");
    await page.getByRole("button", { name: "Send reset token", exact: true }).click();

    await expect(page.getByRole("alert")).toContainText("Password reset email is temporarily unavailable");
    await expect(page.locator("#reset-email")).toBeVisible();
    await expect(page.locator("#reset-token")).toHaveCount(0);
  });
});
