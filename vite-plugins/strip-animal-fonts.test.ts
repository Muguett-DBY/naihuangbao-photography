import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { stripAnimalIslandFontFaces } from "./strip-animal-fonts";

describe("animal-island-ui font optimization", () => {
  it("removes bundled font faces without removing component styles", () => {
    const css = readFileSync(
      resolve(process.cwd(), "node_modules/animal-island-ui/dist/index.css"),
      "utf8",
    );

    expect(css).toContain("@font-face");
    const optimized = stripAnimalIslandFontFaces(css);

    expect(optimized).not.toContain("@font-face");
    expect(optimized).toContain(".animal-btn");
    expect(optimized.length).toBeGreaterThan(30_000);
  });

  it("leaves unrelated stylesheets unchanged", () => {
    const css = ".route-loading { color: currentColor; }";

    expect(stripAnimalIslandFontFaces(css)).toBe(css);
  });
});
