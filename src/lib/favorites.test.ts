import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("favorites system", () => {
  it("ships a useFavorites hook with localStorage persistence and toggle/remove/clear", () => {
    const source = read("src/hooks/useFavorites.ts");
    expect(source).toContain("useFavorites");
    expect(source).toContain("nhb-favorite-photos");
    expect(source).toContain("toggle");
    expect(source).toContain("remove");
    expect(source).toContain("clear");
    expect(source).toContain("isFavorite");
  });

  it("ships a FavoriteButton with icon/pill variants and aria-pressed", () => {
    const source = read("src/components/FavoriteButton.tsx");
    expect(source).toContain("FavoriteButton");
    expect(source).toContain("aria-pressed");
    expect(source).toContain("favorite-btn--icon");
    expect(source).toContain("favorite-btn--pill");
  });

  it("wires FavoriteButton into the photo detail page", () => {
    const source = read("src/pages/PhotoDetailPage.tsx");
    expect(source).toContain("FavoriteButton");
  });

  it("ships localized favorite labels in all locales", () => {
    for (const localePath of [
      "src/i18n/locales/zh-CN.json",
      "src/i18n/locales/en.json",
      "src/i18n/locales/ja.json",
      "src/i18n/locales/ko.json",
    ]) {
      const locale = JSON.parse(read(localePath));
      expect(locale.favorites.add).toBeTruthy();
      expect(locale.favorites.remove).toBeTruthy();
      expect(locale.favorites.save).toBeTruthy();
      expect(locale.favorites.saved).toBeTruthy();
      expect(locale.favorites.title).toBeTruthy();
      expect(locale.favorites.empty).toBeTruthy();
      expect(locale.favorites.count).toBeTruthy();
      expect(locale.favorites.clearAll).toBeTruthy();
    }
  });

  it("wires FavoritesTab into the dashboard", () => {
    const tab = read("src/components/dashboard/FavoritesTab.tsx");
    expect(tab).toContain("FavoritesTab");
    expect(tab).toContain("useFavorites");
    expect(tab).toContain("dashboard-favorites-grid");

    const page = read("src/pages/DashboardPage.tsx");
    expect(page).toContain("FavoritesTab");
    expect(page).toContain("favorites");
  });
});
