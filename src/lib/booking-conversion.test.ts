import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("public booking conversion shell", () => {
  it("organizes the complete booking journey as numbered semantic groups", () => {
    const bookingPage = read("src/pages/BookingPage.tsx");
    const bookingModal = read("src/components/BookingModal.tsx");

    expect(bookingPage).toContain('className="booking-page booking-page--editorial"');
    expect(bookingPage).toContain('image="/images/gallery/');
    expect(bookingModal).toContain('<ol className="booking-step-rail"');
    expect(bookingModal).toContain('className="booking-numbered-group"');
    expect(bookingModal).toContain('booking-group-index">01');
    expect(bookingModal).toContain('booking-group-index">05');
  });

  it("gives authentication modes and location search complete keyboard semantics", () => {
    const login = read("src/pages/LoginPage.tsx");
    const locationSearch = read("src/components/LocationSearch.tsx");

    expect(login).toContain('className="auth-page-media"');
    expect(login).toContain('className="login-mode-switch"');
    expect(login).toContain("aria-pressed={mode === \"login\"}");
    expect(login).not.toContain("tabIndex={-1}");
    expect(login).not.toContain("/images/gallery/1200/");
    expect(locationSearch).toContain('htmlFor="location-search-input"');
    expect(locationSearch).toContain('role="combobox"');
    expect(locationSearch).toContain("aria-activedescendant");
    expect(locationSearch).not.toContain("<li\n              key={loc}\n              className=\"location-search-item\"\n              onClick");
  });

  it("keeps the map toolbar labeled and reports selected view state", () => {
    const map = read("src/pages/MapPage.tsx");

    expect(map).toContain('className="map-page map-page--editorial"');
    expect(map).toContain('role="group"');
    expect(map).toContain('aria-pressed={view === "map"}');
    expect(map).toContain('aria-pressed={view === "list"}');
  });

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
