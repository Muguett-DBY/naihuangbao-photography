import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("sitemap generator", () => {
  it("ships a build-time generator script that emits a sitemap.xml with hreflang and image entries", () => {
    const source = read("scripts/build-sitemap.ts");
    expect(source).toContain("STATIC_PAGES");
    expect(source).toContain("hreflang");
    expect(source).toContain("image:image");
    expect(source).toContain("lastmod");
    expect(source).toContain("writeFileSync");
  });

  it("is wired into the build:full pipeline", () => {
    const pkg = read("package.json");
    expect(pkg).toContain("sitemap:build");
    expect(pkg).toContain("build:full");
  });

  it("emits hreflang alternates for every public page in all four supported languages", () => {
    const source = read("scripts/build-sitemap.ts");
    expect(source).toContain('"zh-CN"');
    expect(source).toContain('"en"');
    expect(source).toContain('"ja"');
    expect(source).toContain('"ko"');
    expect(source).toContain("x-default");
    expect(source).toContain("hreflang");
  });
});
