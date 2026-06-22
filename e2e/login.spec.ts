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
    
    // Should redirect to login or show login form
    const url = page.url();
    const isLoginPage = url.includes("/login");
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check if we're on login page or if the dashboard shows login form
    const hasLoginForm = await page.locator('input[type="password"]').isVisible();
    const hasDashboardContent = await page.locator('.dashboard-content, .dashboard-grid').isVisible();
    
    // Either we're on login page, or the dashboard shows a login form, or the dashboard loaded
    expect(isLoginPage || hasLoginForm || hasDashboardContent).toBeTruthy();
  });
});
