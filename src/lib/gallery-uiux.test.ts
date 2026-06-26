import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("gallery discovery UI/UX contracts", () => {
  it("ships a cohesive command center with persistent view state and reset recovery", () => {
    const gallerySource = read("src/components/Gallery.tsx");

    expect(gallerySource).toContain("GALLERY_STATE_KEY");
    expect(gallerySource).toContain("nhb-gallery-discovery-state");
    expect(gallerySource).toContain("loadPersistedState");
    expect(gallerySource).toContain("persistGalleryState");
    expect(gallerySource).toContain('params.set("view", viewMode)');
    expect(gallerySource).toContain('params.set("album", albumFilter)');
    expect(gallerySource).toContain('params.set("date", dateRange)');
    expect(gallerySource).toContain('params.set("sort", sortMode)');
    expect(gallerySource).toContain("resetGalleryDiscovery");
    expect(gallerySource).toContain('className="gallery-command-center"');
    expect(gallerySource).toContain('className="gallery-active-chips"');
    expect(gallerySource).toContain('className="gallery-empty-state"');
    expect(gallerySource).toContain('role="status"');
    expect(gallerySource).toContain('aria-live="polite"');
    expect(gallerySource).toContain("gallery-restored-banner");
  });

  it("persists advanced gallery facets in URLs, local state, and saved searches", () => {
    const gallerySource = read("src/components/Gallery.tsx");
    const savedSearchesSource = read("src/hooks/useSavedSearches.ts");

    expect(gallerySource).toContain("album: string");
    expect(gallerySource).toContain("dateRange: DateRange");
    expect(gallerySource).toContain("sort: SortMode");
    expect(gallerySource).toContain('const urlAlbum = searchParams.get("album")');
    expect(gallerySource).toContain('const urlDate = searchParams.get("date")');
    expect(gallerySource).toContain('const urlSort = searchParams.get("sort")');
    expect(gallerySource).toContain("useState<string>(initialState.album)");
    expect(gallerySource).toContain("useState<DateRange>(initialState.dateRange)");
    expect(gallerySource).toContain("useState<SortMode>(initialState.sort)");
    expect(gallerySource).toContain("setAlbumFilter(item.album");
    expect(gallerySource).toContain("setDateRange((item.dateRange");
    expect(gallerySource).toContain("setSortMode((item.sort");
    expect(savedSearchesSource).toContain("album: string");
    expect(savedSearchesSource).toContain("dateRange: string");
    expect(savedSearchesSource).toContain("sort: string");
    expect(savedSearchesSource).toContain("entry.album");
    expect(savedSearchesSource).toContain("entry.dateRange");
    expect(savedSearchesSource).toContain("entry.sort");
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
      expect(locale.gallery.facetsLabel).toBeTruthy();
      expect(locale.gallery.albumLabel).toBeTruthy();
      expect(locale.gallery.albumAll).toBeTruthy();
      expect(locale.gallery.dateRangeLabel).toBeTruthy();
      expect(locale.gallery.dateRangeAll).toBeTruthy();
      expect(locale.gallery.dateRanges["last-365"]).toBeTruthy();
      expect(locale.gallery.photos).toBeTruthy();
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
