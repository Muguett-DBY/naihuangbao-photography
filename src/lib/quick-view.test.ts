import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("quick view modal", () => {
  it("ships a QuickView component with focus trap, Escape close, and return focus", () => {
    const source = read("src/components/QuickView.tsx");
    expect(source).toContain("QuickView");
    expect(source).toContain("useFocusTrap");
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain("aria-labelledby");
    expect(source).toContain("Escape");
    expect(source).toContain("lastActiveRef");
  });

  it("wires a gallery-quick-view-btn into the gallery card overlay", () => {
    const gallery = read("src/components/Gallery.tsx");
    expect(gallery).toContain("QuickView");
    expect(gallery).toContain("setQuickViewPhoto");
    expect(gallery).toContain("gallery-quick-view-btn");
  });

  it("styles the quick view with a slide-in/pop-in animation", () => {
    const css = read("src/styles/pages.css");
    expect(css).toContain("quick-view-overlay-in");
    expect(css).toContain("quick-view-pop-in");
    expect(css).toContain("quick-view-cta");
  });

  it("ships localized quick view labels in all four locales", () => {
    for (const localePath of [
      "src/i18n/locales/zh-CN.json",
      "src/i18n/locales/en.json",
      "src/i18n/locales/ja.json",
      "src/i18n/locales/ko.json",
    ]) {
      const locale = JSON.parse(read(localePath));
      expect(locale.quickView.label).toBeTruthy();
      expect(locale.quickView.close).toBeTruthy();
      expect(locale.quickView.viewDetails).toBeTruthy();
    }
  });
});
