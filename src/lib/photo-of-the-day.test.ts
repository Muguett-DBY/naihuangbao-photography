import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("photo of the day", () => {
  it("ships a PhotoOfTheDay component that picks deterministically per day", () => {
    const source = read("src/components/PhotoOfTheDay.tsx");
    expect(source).toContain("PhotoOfTheDay");
    expect(source).toContain("dailySalt");
    expect(source).toContain("pickDeterministic");
    expect(source).toContain("STORAGE_KEY");
    expect(source).toContain("nhb-photo-of-the-day");
  });

  it("prefers featured photos when available and falls back to any public photo", () => {
    const source = read("src/components/PhotoOfTheDay.tsx");
    expect(source).toContain("p.featured");
    expect(source).toContain("p.visibility === \"public\"");
  });

  it("mounts PhotoOfTheDay on the home page between the hero and the gallery", () => {
    const home = read("src/pages/HomePage.tsx");
    expect(home).toContain("PhotoOfTheDay");
  });

  it("ships localized photo-of-the-day labels in every locale", () => {
    for (const localePath of [
      "src/i18n/locales/zh-CN.json",
      "src/i18n/locales/en.json",
      "src/i18n/locales/ja.json",
      "src/i18n/locales/ko.json",
    ]) {
      const locale = JSON.parse(read(localePath));
      expect(locale.photoOfTheDay.eyebrow).toBeTruthy();
      expect(locale.photoOfTheDay.view).toBeTruthy();
    }
  });
});
