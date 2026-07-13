import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const indexRoutes = [
  "src/pages/CoursesPage.tsx",
  "src/pages/ProductsPage.tsx",
  "src/pages/WorkshopsPage.tsx",
  "src/pages/ShopPage.tsx",
];

const detailRoutes = [
  "src/pages/CourseDetailPage.tsx",
  "src/pages/PresetDetailPage.tsx",
  "src/pages/WorkshopDetailPage.tsx",
  "src/pages/ShopDetailPage.tsx",
];

describe("editorial catalogue routes", () => {
  it("gives PageHero local media and issue metadata without breaking text-only callers", () => {
    const source = read("src/components/shared/PageHero.tsx");

    expect(source).toContain("image?: string");
    expect(source).toContain("imageAlt?: string");
    expect(source).toContain("issue?: string");
    expect(source).toContain("<picture");
    expect(source).toContain('type="image/avif"');
    expect(source).toContain('className="page-hero-issue"');
  });

  it("renders shared loading, error, and empty states as recoverable live regions", () => {
    const dataState = read("src/components/shared/DataState.tsx");
    const loading = read("src/components/shared/DetailLoading.tsx");
    const notFound = read("src/components/shared/DetailNotFound.tsx");

    expect(dataState).toContain("action?: ReactNode");
    expect(dataState).toContain('className="data-state-actions"');
    expect(dataState).toContain('aria-live="polite"');
    expect(dataState).toContain('role="alert"');
    expect(loading).toContain('className="detail-state detail-state--loading"');
    expect(loading).toContain('aria-live="polite"');
    expect(notFound).toContain('className="detail-state detail-state--not-found"');
    expect(notFound).toContain('className="detail-state-marker"');
  });

  it("localizes shared state guidance in every supported language", () => {
    const dataState = read("src/components/shared/DataState.tsx");
    const loading = read("src/components/shared/DetailLoading.tsx");
    const notFound = read("src/components/shared/DetailNotFound.tsx");
    const sharedStates = dataState + loading + notFound;

    expect(sharedStates).not.toMatch(/["'`][^"'`]*[\u3400-\u9fff][^"'`]*["'`]/u);
    expect(loading).toContain('t("common.detailLoadingHint")');
    expect(notFound).toContain('t("common.detailNotFoundHint")');

    for (const locale of ["en", "zh-CN", "ja", "ko"]) {
      const messages = JSON.parse(read(`src/i18n/locales/${locale}.json`)) as {
        common: Record<string, string>;
      };
      for (const key of ["loadingHint", "loadErrorHint", "emptyHint", "detailLoadingHint", "detailNotFoundHint"]) {
        expect(messages.common[key]).toBeTruthy();
      }
    }
  });

  it("art-directs every index with an authorized local image and issue label", () => {
    for (const path of indexRoutes) {
      const source = read(path);
      expect(source).toMatch(/image="\/images\/gallery\/gallery-[a-z-]+-01\.webp"/);
      expect(source).toMatch(/imageAlt=\{t\(/);
      expect(source).toMatch(/issue="ISSUE \d{2}"/);
      expect(source).toContain('className="catalogue-page');
    }
  });

  it("uses semantic, scan-friendly catalogue entries", () => {
    for (const path of indexRoutes) {
      const source = read(path);
      expect(source).toContain("<article");
      expect(source).toContain("catalogue-card-index");
    }
  });

  it("applies workshop status filters and switches between grid and calendar views", () => {
    const source = read("src/pages/WorkshopsPage.tsx");
    const detail = read("src/pages/WorkshopDetailPage.tsx");

    expect(source).toContain("filteredWorkshops.map");
    expect(source).toContain('viewMode === "calendar"');
    expect(source).toContain("calendarMonths");
    expect(source).toContain("getWorkshopAvailability(workshop)");
    expect(detail).toContain("getWorkshopAvailability(workshop)");
    expect(source).toContain('statusFilter === "ongoing"');
    expect(source).not.toContain('value="past"');
    expect(source + detail).not.toContain("(workshop.max_participants || 0) - workshop.current_participants");
  });

  it("keeps the mobile workshop filter above persistent navigation and device safe areas", () => {
    const css = read("src/styles/pages.css");

    expect(css).toMatch(
      /\.workshop-filter-overlay\s*\{[^}]*z-index:\s*(?:[1-9]\d{3,})/s,
    );
    expect(css).toMatch(
      /\.workshop-filter-sheet\s*\{[^}]*padding-bottom:\s*calc\(20px \+ env\(safe-area-inset-bottom\)\)/s,
    );
  });

  it("gives every detail route a consistent media and action split", () => {
    for (const path of detailRoutes) {
      const source = read(path);
      expect(source).toContain('className="catalogue-detail-page');
      expect(source).toContain("catalogue-detail-stage");
      expect(source).toContain("catalogue-detail-summary");
    }
  });

  it("only tracks real preset downloads and does not manufacture product ratings", () => {
    const index = read("src/pages/ProductsPage.tsx");
    const detail = read("src/pages/PresetDetailPage.tsx");

    expect(index).toContain("preset.download_url ?");
    expect(detail).toContain("preset.download_url ?");
    expect(index + detail).toContain("keepalive: true");
    expect(detail).not.toContain("aggregateRating");
    expect(detail).not.toContain("Math.round(preset.download_count / 3)");
  });

  it("keeps catalogue detail controls at reliable touch-target sizes", () => {
    const backLink = read("src/components/shared/DetailBackLink.tsx");
    const css = read("src/styles/pages.css");

    expect(backLink).toContain('className="detail-back-link"');
    for (const selector of [
      "detail-back-link",
      "compare-slider-reset",
      "preset-preview-filter-btn",
      "preset-preview-toggle-btn",
      "preset-preview-download",
    ]) {
      expect(css).toMatch(new RegExp(`\\.${selector}\\s*\\{[^}]*min-height:\\s*44px`, "s"));
    }
    expect(css).toMatch(
      /\.preset-preview-intensity input\[type="range"\]\s*\{[^}]*height:\s*44px/s,
    );
    expect(css).toMatch(
      /\.workshop-detail-location-card a\s*\{[^}]*min-height:\s*44px/s,
    );
    expect(css).toMatch(
      /\.course-detail-purchase-box button,[\s\S]*\.workshop-detail-register-card button\s*\{[^}]*min-height:\s*44px/s,
    );
  });

  it("keeps catalogue surfaces square, unframed, and responsive", () => {
    const css = read("src/styles/pages.css");

    expect(css).toContain("/* Editorial catalogue and detail routes. */");
    expect(css).toMatch(/\.catalogue-card\s*\{[\s\S]*border-radius:\s*0/s);
    expect(css).toMatch(/\.catalogue-detail-stage\s*\{[\s\S]*grid-template-columns:/s);
    expect(css).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*\.catalogue-detail-stage/s);
  });
});
