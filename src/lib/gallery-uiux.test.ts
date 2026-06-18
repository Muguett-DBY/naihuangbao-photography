import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("gallery discovery UI/UX contracts", () => {
  it("ships a cohesive command center with persistent view state and reset recovery", () => {
    const gallerySource = read("src/components/Gallery.tsx");

    expect(gallerySource).toContain("GALLERY_VIEW_STORAGE_KEY");
    expect(gallerySource).toContain('searchParams.get("view")');
    expect(gallerySource).toContain("window.localStorage.setItem(GALLERY_VIEW_STORAGE_KEY");
    expect(gallerySource).toContain('params.set("view", viewMode)');
    expect(gallerySource).toContain("resetGalleryDiscovery");
    expect(gallerySource).toContain('className="gallery-command-center"');
    expect(gallerySource).toContain('className="gallery-active-chips"');
    expect(gallerySource).toContain('className="gallery-empty-state"');
    expect(gallerySource).toContain('role="status"');
    expect(gallerySource).toContain('aria-live="polite"');
  });

  it("localizes discovery, active-state, and empty-result copy in every public locale", () => {
    for (const localePath of [
      "src/i18n/locales/zh-CN.json",
      "src/i18n/locales/en.json",
      "src/i18n/locales/ja.json",
      "src/i18n/locales/ko.json",
    ]) {
      const locale = JSON.parse(read(localePath));
      expect(locale.gallery.discoveryKicker).toBeTruthy();
      expect(locale.gallery.discoveryTitle).toBeTruthy();
      expect(locale.gallery.resultSummary).toBeTruthy();
      expect(locale.gallery.activeFilter).toBeTruthy();
      expect(locale.gallery.activeSearch).toBeTruthy();
      expect(locale.gallery.activeView).toBeTruthy();
      expect(locale.gallery.clearDiscovery).toBeTruthy();
      expect(locale.gallery.emptyTitle).toBeTruthy();
      expect(locale.gallery.emptyDesc).toBeTruthy();
      expect(locale.gallery.emptyReset).toBeTruthy();
    }
  });

  it("keeps the command center polished, responsive, and accessible in CSS", () => {
    const cssSource = read("src/styles/gallery.css");

    for (const selector of [
      ".gallery-command-center",
      ".gallery-command-header",
      ".gallery-command-meta",
      ".gallery-active-chips",
      ".gallery-empty-state",
      ".gallery-filter-scroll",
    ]) {
      expect(cssSource).toContain(selector);
    }

    expect(cssSource).toMatch(/\.gallery-command-center\s*\{[\s\S]*position:\s*relative/s);
    expect(cssSource).toMatch(/\.gallery-command-center\s*\{[\s\S]*box-shadow:/s);
    expect(cssSource).toMatch(/\.gallery-filter-scroll\s*\{[\s\S]*overflow-x:\s*auto/s);
    expect(cssSource).toMatch(/@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*\.gallery-command-center/s);
    expect(cssSource).toMatch(/@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*padding-bottom:\s*calc\(18px \+ var\(--mobile-bottom-nav-offset/s);
    expect(cssSource).toMatch(/\.filter-row button:disabled\s*\{/s);
    expect(cssSource).toMatch(/\.gallery-empty-state\s+button:focus-visible\s*\{/s);
  });
});
