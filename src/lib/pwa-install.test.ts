import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("PWA install banner", () => {
  it("ships a PwaInstallBanner that uses beforeinstallprompt and tracks dismiss in localStorage", () => {
    const source = read("src/components/PwaInstallBanner.tsx");
    expect(source).toContain("PwaInstallBanner");
    expect(source).toContain("beforeinstallprompt");
    expect(source).toContain("nhb-pwa-install-dismissed");
    expect(source).toContain("prompt()");
    expect(source).toContain("nhb-visit-count");
    expect(source).toContain("MIN_VISITS");
  });

  it("wires PwaInstallBanner into the root layout shell", () => {
    const layout = read("src/layouts/RootLayout.tsx");
    expect(layout).toContain("PwaInstallBanner");
    expect(layout).toContain("is-editor");
  });

  it("styles the banner with a slide-up animation at the bottom of the viewport", () => {
    const css = read("src/styles/base.css");
    expect(css).toContain("pwa-install-banner");
    expect(css).toContain("pwa-banner-slide-up");
    expect(css).toContain("pwa-install-btn");
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
      expect(locale.pwaInstall.text).toBeTruthy();
      expect(locale.pwaInstall.install).toBeTruthy();
      expect(locale.pwaInstall.dismiss).toBeTruthy();
    }
  });
});
