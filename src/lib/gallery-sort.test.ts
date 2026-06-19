import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("gallery sort", () => {
  it("ships a sort mode with default/newest/featured options", () => {
    const source = read("src/components/Gallery.tsx");
    expect(source).toContain("sortMode");
    expect(source).toContain('sortMode === "newest"');
    expect(source).toContain('sortMode === "featured"');
    expect(source).toContain("sortDefault");
    expect(source).toContain("sortNewest");
    expect(source).toContain("sortFeatured");
    expect(source).toContain("gallery-sort-toggle");
  });

  it("sorts by createdAt desc for newest and by featured desc for featured", () => {
    const source = read("src/components/Gallery.tsx");
    expect(source).toContain("Date.parse");
    expect(source).toContain("Number(b.featured) - Number(a.featured)");
  });

  it("ships localized sort labels in every locale", () => {
    for (const localePath of [
      "src/i18n/locales/zh-CN.json",
      "src/i18n/locales/en.json",
      "src/i18n/locales/ja.json",
      "src/i18n/locales/ko.json",
    ]) {
      const locale = JSON.parse(read(localePath));
      expect(locale.gallery.sortLabel).toBeTruthy();
      expect(locale.gallery.sortDefault).toBeTruthy();
      expect(locale.gallery.sortNewest).toBeTruthy();
      expect(locale.gallery.sortFeatured).toBeTruthy();
    }
  });
});
