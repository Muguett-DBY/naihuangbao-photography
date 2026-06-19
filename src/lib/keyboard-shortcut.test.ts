import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("gallery keyboard shortcuts", () => {
  it("ships a useKeyboardShortcut hook that ignores typing and modifier keys", () => {
    const source = read("src/hooks/useKeyboardShortcut.ts");
    expect(source).toContain("useKeyboardShortcut");
    expect(source).toContain("INPUT");
    expect(source).toContain("TEXTAREA");
    expect(source).toContain("isContentEditable");
    expect(source).toContain("metaKey");
    expect(source).toContain("ctrlKey");
    expect(source).toContain("altKey");
  });

  it("wires slash to focus the gallery search and Escape to clear it", () => {
    const source = read("src/components/Gallery.tsx");
    expect(source).toContain("useKeyboardShortcut");
    expect(source).toContain('key: "/"');
    expect(source).toContain('key: "Escape"');
    expect(source).toContain("searchInputRef.current?.focus()");
  });

  it("shows a kbd hint badge inside the search input when not typing", () => {
    const css = read("src/styles/gallery.css");
    expect(css).toContain(".gallery-search-shortcut");
    const gallery = read("src/components/Gallery.tsx");
    expect(gallery).toContain("gallery-search-shortcut");
  });
});
