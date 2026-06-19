import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("photo compare system", () => {
  it("ships a useCompare hook with toggle/clear/remove and a 2-item limit", () => {
    const source = read("src/hooks/useCompare.ts");
    expect(source).toContain("useCompare");
    expect(source).toContain("MAX_ITEMS");
    expect(source).toContain("toggle");
    expect(source).toContain("clear");
    expect(source).toContain("remove");
  });

  it("ships a CompareButton and a sticky CompareBar", () => {
    const button = read("src/components/CompareButton.tsx");
    expect(button).toContain("CompareButton");
    expect(button).toContain("aria-pressed");
    expect(button).toContain("compare-btn");
    const bar = read("src/components/CompareBar.tsx");
    expect(bar).toContain("CompareBar");
    expect(bar).toContain("compare-bar-cta");
    expect(bar).toContain("compare-bar-list");
  });

  it("routes a /compare page from the React router and renders the comparison grid", () => {
    const router = read("src/router.tsx");
    expect(router).toMatch(/path:\s*"compare"/);
    expect(router).toContain("ComparePage");
    const page = read("src/pages/ComparePage.tsx");
    expect(page).toContain("ComparePage");
    expect(page).toContain("compare-page-grid");
  });

  it("mounts CompareBar in the gallery and CompareButton on every card", () => {
    const gallery = read("src/components/Gallery.tsx");
    expect(gallery).toContain("CompareBar");
    expect(gallery).toContain("CompareButton");
  });

  it("adds a 'c' keyboard shortcut to open /compare when 2 items are queued", () => {
    const gallery = read("src/components/Gallery.tsx");
    expect(gallery).toContain("useCompare");
    expect(gallery).toContain('key: "c"');
    expect(gallery).toContain("window.location.assign(\"/compare\")");
  });

  it("animates the compare bar with a slide-in keyframe and pulses the CTA", () => {
    const css = read("src/styles/pages.css");
    expect(css).toContain("compare-bar-slide-in");
    expect(css).toContain("compare-bar-cta-pulse");
    expect(css).toContain("compare-bar-kbd");
  });

  it("ships localized photoCompare labels in all four locales", () => {
    for (const localePath of [
      "src/i18n/locales/zh-CN.json",
      "src/i18n/locales/en.json",
      "src/i18n/locales/ja.json",
      "src/i18n/locales/ko.json",
    ]) {
      const locale = JSON.parse(read(localePath));
      expect(locale.photoCompare).toBeTruthy();
      expect(locale.photoCompare.add).toBeTruthy();
      expect(locale.photoCompare.remove).toBeTruthy();
      expect(locale.photoCompare.title).toBeTruthy();
      expect(locale.photoCompare.open).toBeTruthy();
    }
  });
});
