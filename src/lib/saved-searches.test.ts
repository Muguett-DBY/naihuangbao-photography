import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("gallery saved searches", () => {
  it("ships a useSavedSearches hook with save/remove/clear and storage persistence", () => {
    const source = read("src/hooks/useSavedSearches.ts");
    expect(source).toContain("useSavedSearches");
    expect(source).toContain("nhb-saved-searches");
    expect(source).toContain("save");
    expect(source).toContain("remove");
    expect(source).toContain("clear");
    expect(source).toContain("album: string");
    expect(source).toContain("dateRange: string");
    expect(source).toContain("sort: string");
    expect(source).toContain("entry.album");
    expect(source).toContain("entry.dateRange");
    expect(source).toContain("entry.sort");
  });

  it("renders a save button and saved-search pills in the gallery active chips area", () => {
    const source = read("src/components/Gallery.tsx");
    expect(source).toContain("useSavedSearches");
    expect(source).toContain("gallery-save-search");
    expect(source).toContain("gallery-saved-search-pill");
    expect(source).toContain("gallery-saved-searches");
  });

  it("ships localized saved-search labels in every locale", () => {
    for (const localePath of [
      "src/i18n/locales/zh-CN.json",
      "src/i18n/locales/en.json",
      "src/i18n/locales/ja.json",
      "src/i18n/locales/ko.json",
    ]) {
      const locale = JSON.parse(read(localePath));
      expect(locale.gallery.saveSearch).toBeTruthy();
      expect(locale.gallery.savedSearches).toBeTruthy();
      expect(locale.gallery.removeSavedSearch).toBeTruthy();
    }
  });
});
