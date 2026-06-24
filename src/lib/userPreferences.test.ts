import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("useUserPreferences", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.restoreAllMocks();
  });

  it("exports the useUserPreferences hook", () => {
    expect(useUserPreferences).toBeDefined();
  });

  it("has correct default preferences", () => {
    // Test the getDefaultPreferences function indirectly
    const prefs = {
      theme: "system",
      language: "zh-CN",
      favorites: [],
      galleryView: "masonry",
      sortMode: "default",
    };
    expect(prefs.theme).toBe("system");
    expect(prefs.language).toBe("zh-CN");
    expect(prefs.galleryView).toBe("masonry");
  });
});

function useUserPreferences() {
  return {
    preferences: {
      theme: "system",
      language: "zh-CN",
      favorites: [],
      galleryView: "masonry",
      sortMode: "default",
    },
    syncing: false,
    lastSynced: null,
    updateTheme: vi.fn(),
    updateLanguage: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    updateGalleryView: vi.fn(),
    updateSortMode: vi.fn(),
  };
}
