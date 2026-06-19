import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("recently viewed photos", () => {
  it("ships a useRecentlyViewed hook with localStorage persistence and cross-tab sync", () => {
    const source = read("src/hooks/useRecentlyViewed.ts");
    expect(source).toContain("useRecentlyViewed");
    expect(source).toContain("nhb-recently-viewed-photos");
    expect(source).toContain("MAX_ITEMS");
    expect(source).toContain("recordVisit");
    expect(source).toContain("storage");
  });

  it("ships a RecentlyViewedStrip component with clear button and a11y label", () => {
    const source = read("src/components/RecentlyViewedStrip.tsx");
    expect(source).toContain("RecentlyViewedStrip");
    expect(source).toContain("aria-labelledby");
    expect(source).toContain("aria-label");
    expect(source).toContain("recently-viewed-clear");
    expect(source).toContain("recently-viewed-list");
  });

  it("wires the strip into the photo detail page and records visits", () => {
    const source = read("src/pages/PhotoDetailPage.tsx");
    expect(source).toContain("useRecentlyViewed");
    expect(source).toContain("recordVisit");
    expect(source).toContain("RecentlyViewedStrip");
  });

  it("ships a dashboard RecentlyViewedTab and wires it into the dashboard", () => {
    const tab = read("src/components/dashboard/RecentlyViewedTab.tsx");
    expect(tab).toContain("RecentlyViewedTab");
    expect(tab).toContain("useRecentlyViewed");
    const page = read("src/pages/DashboardPage.tsx");
    expect(page).toContain("RecentlyViewedTab");
    expect(page).toContain("recently-viewed");
  });

  it("ships localized recently viewed copy in all locales", () => {
    for (const localePath of [
      "src/i18n/locales/zh-CN.json",
      "src/i18n/locales/en.json",
      "src/i18n/locales/ja.json",
      "src/i18n/locales/ko.json",
    ]) {
      const locale = JSON.parse(read(localePath));
      expect(locale.recentlyViewed.title).toBeTruthy();
      expect(locale.recentlyViewed.clear).toBeTruthy();
      expect(locale.recentlyViewed.tabLabel).toBeTruthy();
      expect(locale.recentlyViewed.tabEmpty).toBeTruthy();
    }
  });
});
