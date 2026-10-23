import { afterEach, describe, expect, it, vi } from "vitest";
import { safeLocalStorage } from "./browser-storage";
import { getLocalPublication, rememberLocalPublication } from "./project-publication-registry";
import type { PublishedProjectReceipt } from "../types/published-project";

afterEach(() => vi.restoreAllMocks());

describe("local publication registry compatibility", () => {
  it("reads existing v1 receipts and preserves other projects when saving", () => {
    const first: PublishedProjectReceipt = {
      id: "first", url: "/p/first", slug: "first", version: 2,
      publishedAt: "2026-10-23T00:00:00.000Z", contentHash: "first-hash",
    };
    const second: PublishedProjectReceipt = {
      id: "second", url: "/p/second", slug: "second", version: 3,
      publishedAt: "2026-10-23T01:00:00.000Z", contentHash: "second-hash",
    };
    const storage = new Map([["nhb-publication-registry-v1", JSON.stringify({ first })]]);
    vi.spyOn(safeLocalStorage, "getItem").mockImplementation((key) => storage.get(key) ?? null);
    vi.spyOn(safeLocalStorage, "setItem").mockImplementation((key, value) => { storage.set(key, value); return true; });
    expect(getLocalPublication("first")).toEqual(first);
    rememberLocalPublication("second", second);
    expect(getLocalPublication("first")).toEqual(first);
    expect(getLocalPublication("second")).toEqual(second);
    expect(JSON.parse(storage.get("nhb-publication-registry-v1")!)).toEqual({ first, second });
  });

  it("tolerates an invalid or absent persisted registry", () => {
    vi.spyOn(safeLocalStorage, "getItem").mockReturnValueOnce("not JSON").mockReturnValue(null);
    expect(getLocalPublication("missing")).toBeNull();
    expect(getLocalPublication("missing")).toBeNull();
  });
});
