import { expect, test, type Page } from "@playwright/test";

type SeedStatus = "pending" | "failed";

async function seedOfflineBooking(page: Page, status: SeedStatus) {
  await page.evaluate(async (nextStatus) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("nhb-bookings", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("pending-bookings")) {
          db.createObjectStore("pending-bookings", { keyPath: "id" });
        }
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("pending-bookings", "readwrite");
        tx.objectStore("pending-bookings").put({
          id: `recovery-${nextStatus}`,
          packageName: "Portrait Session",
          preferredDate: "2099-09-18",
          preferredTime: "afternoon",
          name: "Recovery Guest",
          contact: "recovery@example.com",
          notes: "Saved locally",
          createdAt: "2099-09-01T00:00:00.000Z",
          status: nextStatus,
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, status);
}

test.describe("offline booking recovery", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test("shows a failed local booking and lets the customer remove it", async ({ page }) => {
    await page.goto("/");
    await seedOfflineBooking(page, "failed");
    await page.evaluate(() => window.dispatchEvent(new Event("nhb:pending-bookings-changed")));

    const recovery = page.locator(".offline-booking-recovery");
    await expect(recovery).toBeVisible();
    await expect(recovery.getByText("Portrait Session", { exact: true })).toBeVisible();
    await expect(recovery.getByText("2099-09-18", { exact: true })).toBeVisible();

    await recovery.locator(".offline-booking-recovery-remove").click();
    await expect(recovery).toBeHidden();
  });

  test("syncs an offline request after the booking modal has closed", async ({ page, context }) => {
    await page.route("**/api/availability**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ dates: {} }),
    }));
    await page.route("**/api/booking", (route) => route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "synced-offline-booking" }),
    }));

    await page.goto("/");
    await expect(page.locator(".hero-cover-primary-btn")).toBeVisible();
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await page.locator(".hero-cover-primary-btn").click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.locator("#booking-name").fill("Offline Guest");
    await page.locator("#booking-contact").fill("offline@example.com");
    await page.getByRole("button", { name: "Send Booking", exact: true }).click();

    await expect(page.locator(".booking-success-offline-note")).toBeVisible();
    await page.getByRole("button", { name: "Continue browsing", exact: true }).click();
    await expect(page.locator(".booking-modal-content")).toBeHidden();
    await expect(page.locator(".offline-booking-recovery")).toBeVisible();

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));

    await expect(page.locator(".offline-booking-recovery--success")).toBeVisible();
    const remaining = await page.evaluate(async () => {
      return await new Promise<number>((resolve, reject) => {
        const request = indexedDB.open("nhb-bookings", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("pending-bookings", "readonly");
          const count = tx.objectStore("pending-bookings").count();
          count.onsuccess = () => resolve(count.result);
          count.onerror = () => reject(count.error);
        };
      });
    });
    expect(remaining).toBe(0);
  });
});
