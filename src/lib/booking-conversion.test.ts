import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("public booking conversion shell", () => {
  it("loads only the Modal structural CSS sidecar", () => {
    const bookingModal = read("src/components/BookingModal.tsx");
    const animalTheme = read("src/styles/animal-theme.css");
    const main = read("src/main.tsx");

    expect(animalTheme).toContain('@import "animal-island-ui/es/components/Modal/modal.module.css"');
    expect(bookingModal).not.toContain('animal-island-ui/es/components/Modal/modal.module.css');
    expect(bookingModal).toContain("booking-modal-close");
    expect(bookingModal).toContain("<X");
    expect(main).not.toContain('animal-island-ui/style');
  });

  it("does not advertise notifications without a delivery path", () => {
    const layout = read("src/layouts/RootLayout.tsx");
    const baseCss = read("src/styles/base.css");
    const pagesCss = read("src/styles/pages.css");

    expect(layout).not.toContain("PushNotificationBanner");
    expect(baseCss).not.toContain("push-notification-banner");
    expect(pagesCss).not.toContain("push-notification-banner");
    expect(existsSync(resolve(root, "src/components/PushNotificationBanner.tsx"))).toBe(false);
    expect(existsSync(resolve(root, "src/hooks/usePushNotification.ts"))).toBe(false);
  });
});
