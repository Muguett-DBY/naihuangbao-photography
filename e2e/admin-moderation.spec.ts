import { expect, test } from "@playwright/test";

const pendingPhotos = [
  {
    id: "pending-a",
    title: "Pending A",
    style: "park",
    location: "Nanjing",
    imageUrl: "/images/gallery/gallery-garden-01.webp",
    alt: "Pending A",
    featured: false,
    visibility: "hidden",
  },
  {
    id: "pending-b",
    title: "Pending B",
    style: "street",
    location: "Nanjing",
    imageUrl: "/images/gallery/gallery-urban-01.webp",
    alt: "Pending B",
    featured: false,
    visibility: "hidden",
  },
];

test("admin confirms and submits moderation rejects as one batch", async ({ page }) => {
  let batchPayload: unknown;

  await page.route("**/api/admin/session", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: true }) })
  );
  await page.route("**/api/admin/bookings", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ bookings: [] }) })
  );
  await page.route("**/api/admin/photos/batch", async (route) => {
    batchPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, deleted: 2, ids: ["pending-a", "pending-b"] }),
    });
  });
  await page.route("**/api/admin/photos*", (route) => {
    const url = new URL(route.request().url());
    const photos = url.searchParams.get("visibility") === "hidden" ? pendingPhotos : [];
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ photos }),
    });
  });

  await page.goto("/admin?lang=en");
  await page.getByRole("button", { name: "Moderation" }).click();
  await expect(page.locator(".admin-moderation-card")).toHaveCount(2);

  await page.locator(".admin-moderation-select").nth(0).click();
  await page.locator(".admin-moderation-select").nth(1).click();
  await page.getByRole("button", { name: "Batch reject" }).click();

  const confirmation = page.locator(".admin-moderation-reject-confirmation");
  await expect(confirmation).toContainText("Permanently reject and delete 2 selected photos?");
  await confirmation.getByRole("button", { name: "Delete selected" }).click();

  await expect.poll(() => batchPayload).toEqual({
    ids: ["pending-a", "pending-b"],
    action: "delete",
  });
  await expect(page.locator(".admin-moderation-card")).toHaveCount(0);
  await expect(page.locator(".admin-moderation-empty")).toBeVisible();
});
