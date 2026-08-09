import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { primaryNavigation } from "../data/product-navigation";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const localeFiles = ["zh-CN", "en", "ja", "ko"] as const;

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" && !Array.isArray(child)
      ? flattenKeys(child, path)
      : [path];
  });
}

describe("booking-first identity and locale completeness", () => {
  it("keeps the primary navigation on the customer booking journey", () => {
    expect(primaryNavigation.map((item) => item.to)).toEqual(["/", "/gallery", "/booking", "/about"]);

    const header = read("src/components/shared/Header.tsx");
    const mobile = read("src/components/shared/MobileBottomNav.tsx");
    const footer = read("src/components/shared/Footer.tsx");
    expect(header).toContain('to="/booking"');
    expect(header).toContain('t("nav.brandDescriptor"');
    expect(header).not.toContain("VISUAL OPERATING SYSTEM");
    expect(header).not.toContain("PERSONAL VISUAL PRACTICE");
    for (const path of ["/gallery", "/booking", "/about", "/dashboard"]) {
      expect(mobile).toContain(`to="${path}"`);
    }
    expect(footer).toContain('to="/booking#packages"');
    expect(footer).toContain('to="/booking#faq"');
    expect(footer).not.toContain("NewsletterForm");
  });

  it("makes real work, packages, process and booking the homepage chapters", () => {
    const home = read("src/pages/HomePage.tsx");
    expect(home).toContain("usePublicPhotos");
    expect(home).toContain("useBookingModal");
    expect(home).toContain("<Packages />");
    for (const id of ["featured", "process", "book"]) {
      expect(home).toContain(`id="${id}"`);
    }
    expect(read("src/components/Packages.tsx")).toContain('id="packages"');
    expect(home).not.toContain("CinematicPremiere");
    expect(home).not.toContain("VisualLightTable");
    expect(home).not.toContain("HomeVisualSystem");
  });

  it("keeps the photographer about page and SEO booking-focused", () => {
    const about = read("src/pages/AboutPage.tsx");
    const site = read("src/data/site.ts");
    const enContent = read("src/data/contents/en.ts");
    const jaContent = read("src/data/contents/ja.ts");
    const koContent = read("src/data/contents/ko.ts");
    expect(about).toContain("useBookingModal");
    expect(about).toContain("sectionCopy.about");
    expect(about).not.toContain("PERSONAL PRACTICE PROJECT");
    expect(site).not.toContain("个人练习项目");
    expect(enContent).not.toContain("Personal practice project");
    expect(jaContent).not.toContain("個人練習プロジェクト");
    expect(koContent).not.toContain("개인 연습 프로젝트");
    expect(jaContent).toContain('brandName: "奶黄んぼ写真撮影"');
    expect(jaContent).toContain('city: "南京"');
    expect(jaContent).toContain('about: { eyebrow: "紹介", title: "奶黄んぼ写真撮影"');
    expect(koContent).toContain('brandName: "나이황바오 사진촬영"');
    expect(koContent).toContain('city: "난징"');
    expect(koContent).toContain('about: { eyebrow: "소개", title: "나이황바오 사진촬영"');

    for (const locale of localeFiles) {
      const messages = JSON.parse(read(`src/i18n/locales/${locale}.json`));
      expect(messages.seo.homeTitle).toBeTruthy();
      expect(messages.seo.homeDesc).toBeTruthy();
      expect(messages.seo.aboutTitle).toBeTruthy();
      expect(messages.seo.aboutDesc).toBeTruthy();
    }
  });

  it("does not let the Chinese CMS response replace other language defaults", () => {
    const api = read("functions/api/content.ts");
    const hook = read("src/hooks/useSiteContent.tsx");
    expect(api).not.toContain("mergeSiteContent(rowsToContent(rows.results))");
    expect(hook).toContain('i18n.language === "zh-CN"');
  });

  it("keeps every locale on the exact same translation-key contract", () => {
    const localeEntries = localeFiles.map((locale) => [
      locale,
      JSON.parse(read(`src/i18n/locales/${locale}.json`)) as unknown,
    ] as const);
    const referenceKeys = flattenKeys(localeEntries[0][1]).sort();
    for (const [locale, messages] of localeEntries.slice(1)) {
      expect(flattenKeys(messages).sort(), `${locale} translation keys`).toEqual(referenceKeys);
    }
  });

  it("indexes the customer-facing booking route", () => {
    const sitemap = read("scripts/build-sitemap.ts");
    expect(sitemap).toContain('{ path: "/booking"');
    expect(sitemap.indexOf('{ path: "/booking"')).toBeLessThan(sitemap.indexOf('{ path: "/archive"'));
  });
});
