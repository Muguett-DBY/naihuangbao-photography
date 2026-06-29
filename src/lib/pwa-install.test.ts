import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("PWA install banner", () => {
  it("persists install eligibility across visits and applies a finite dismissal cooldown", () => {
    const source = read("src/components/PwaInstallBanner.tsx");
    expect(source).toContain("PwaInstallBanner");
    expect(source).toContain("beforeinstallprompt");
    expect(source).toContain("nhb-visit-count");
    expect(source).toContain("MIN_VISITS");
    expect(source).toContain("DISMISS_COOLDOWN_MS");
    expect(source).toContain("window.localStorage");
    expect(source).not.toContain("window.sessionStorage");
  });

  it("tracks the browser install outcome and stops prompting installed apps", () => {
    const source = read("src/components/PwaInstallBanner.tsx");

    expect(source).toContain("userChoice");
    expect(source).toContain("appinstalled");
    expect(source).toContain('matchMedia("(display-mode: standalone)")');
    expect(source).toContain("showTimerRef");
    expect(source).toContain("installing");
    expect(source).toMatch(/choice\.outcome === "accepted"[\s\S]*writeStoredValue\(INSTALLED_KEY, "true"\)/);
  });

  it("wires PwaInstallBanner into the root layout shell", () => {
    const layout = read("src/layouts/RootLayout.tsx");
    expect(layout).toContain("PwaInstallBanner");
    expect(layout).toContain("is-editor");
  });

  it("styles a responsive install panel with visible progress feedback", () => {
    const css = read("src/styles/base.css");
    expect(css).toContain("pwa-install-banner");
    expect(css).toContain("pwa-banner-slide-up");
    expect(css).toContain("pwa-install-btn");
    expect(css).toContain("pwa-install-copy");
    expect(css).toContain("pwa-install-status");
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*\.pwa-install-banner/);
  });

  it("ships localized install labels in all four locales", () => {
    for (const localePath of [
      "src/i18n/locales/zh-CN.json",
      "src/i18n/locales/en.json",
      "src/i18n/locales/ja.json",
      "src/i18n/locales/ko.json",
    ]) {
      const locale = JSON.parse(read(localePath));
      expect(locale.pwaInstall.label).toBeTruthy();
      expect(locale.pwaInstall.title).toBeTruthy();
      expect(locale.pwaInstall.text).toBeTruthy();
      expect(locale.pwaInstall.benefit).toBeTruthy();
      expect(locale.pwaInstall.install).toBeTruthy();
      expect(locale.pwaInstall.installing).toBeTruthy();
      expect(locale.pwaInstall.later).toBeTruthy();
      expect(locale.pwaInstall.error).toBeTruthy();
      expect(locale.pwaInstall.dismiss).toBeTruthy();
    }
  });
});
