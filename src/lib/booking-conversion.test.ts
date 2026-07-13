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

  it("uses server-confirmed account linkage for dashboard follow-up", () => {
    const bookingModal = read("src/components/BookingModal.tsx");
    const locales = ["en", "zh-CN", "ja", "ko"].map((locale) => (
      JSON.parse(read(`src/i18n/locales/${locale}.json`)) as {
        bookingModal: {
          nextStepLinked?: string;
          nextStepContact?: string;
          successBridgeDashboardDetail?: string;
          successBridgeWaitlistDetail?: string;
          successBridgeContactDetail?: string;
        };
        dashboard: { waitlist?: { waiting?: string; notified?: string } };
      }
    ));

    expect(bookingModal).toContain("accountLinked");
    expect(bookingModal).toContain("setAccountLinked");
    expect(bookingModal).toContain("const showDashboard = accountLinked");
    expect(bookingModal).not.toContain("DASHBOARD_EMAIL_PATTERN");
    expect(bookingModal).not.toContain("isDashboardCompatibleContact");
    expect(bookingModal).toContain("nextStepLinked");
    expect(bookingModal).toContain("nextStepContact");
    expect(bookingModal).toContain("successBridgeContactDetail");
    for (const locale of locales) {
      expect(locale.bookingModal.nextStepLinked).toBeTruthy();
      expect(locale.bookingModal.nextStepContact).toBeTruthy();
      expect(locale.bookingModal.successBridgeDashboardDetail).toBeTruthy();
      expect(locale.bookingModal.successBridgeWaitlistDetail).toBeTruthy();
      expect(locale.bookingModal.successBridgeContactDetail).toBeTruthy();
      expect(locale.dashboard.waitlist?.waiting).toBeTruthy();
      expect(locale.dashboard.waitlist?.notified).toBeTruthy();
    }
  });
});
