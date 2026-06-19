import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("dynamic hreflang link tags", () => {
  it("ships a useHreflang hook that injects alternate links for all 4 supported languages + x-default", () => {
    const source = read("src/hooks/useHreflang.ts");
    expect(source).toContain("useHreflang");
    expect(source).toContain('"zh-CN"');
    expect(source).toContain('"en"');
    expect(source).toContain('"ja"');
    expect(source).toContain('"ko"');
    expect(source).toContain("x-default");
    expect(source).toContain("removeAllHreflang");
  });

  it("wires the hook into the photo detail page so each photo gets per-language alternates", () => {
    const source = read("src/pages/PhotoDetailPage.tsx");
    expect(source).toContain("useHreflang");
    expect(source).toContain("path: id ? `/gallery/${id}` : \"/gallery\"");
  });

  it("builds language-aware hrefs that include ?lang= for non-default locales", () => {
    const source = read("src/hooks/useHreflang.ts");
    expect(source).toContain("?lang=${lang}");
  });
});
