import { afterEach, describe, expect, it, vi } from "vitest";
import { safeLocalStorage } from "./browser-storage";

describe("safeLocalStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns fallback results outside a browser", () => {
    vi.stubGlobal("window", undefined);

    expect(safeLocalStorage.getItem("theme")).toBeNull();
    expect(safeLocalStorage.setItem("theme", "dark")).toBe(false);
    expect(safeLocalStorage.removeItem("theme")).toBe(false);
  });

  it("returns fallback results when the storage property is blocked", () => {
    const blockedWindow = {};
    Object.defineProperty(blockedWindow, "localStorage", {
      get() {
        throw new DOMException("Storage access denied", "SecurityError");
      },
    });
    vi.stubGlobal("window", blockedWindow);

    expect(safeLocalStorage.getItem("theme")).toBeNull();
    expect(safeLocalStorage.setItem("theme", "dark")).toBe(false);
    expect(safeLocalStorage.removeItem("theme")).toBe(false);
  });

  it("reads, writes, and removes values when storage is available", () => {
    const storage = {
      getItem: vi.fn(() => "dark"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as unknown as Storage;
    vi.stubGlobal("window", { localStorage: storage });

    expect(safeLocalStorage.getItem("theme")).toBe("dark");
    expect(safeLocalStorage.setItem("theme", "light")).toBe(true);
    expect(safeLocalStorage.removeItem("theme")).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith("theme", "light");
    expect(storage.removeItem).toHaveBeenCalledWith("theme");
  });

  it("returns fallback results when storage methods throw", () => {
    const storage = {
      getItem: vi.fn(() => { throw new Error("read failed"); }),
      setItem: vi.fn(() => { throw new Error("write failed"); }),
      removeItem: vi.fn(() => { throw new Error("remove failed"); }),
    } as unknown as Storage;
    vi.stubGlobal("window", { localStorage: storage });

    expect(safeLocalStorage.getItem("theme")).toBeNull();
    expect(safeLocalStorage.setItem("theme", "dark")).toBe(false);
    expect(safeLocalStorage.removeItem("theme")).toBe(false);
  });
});
