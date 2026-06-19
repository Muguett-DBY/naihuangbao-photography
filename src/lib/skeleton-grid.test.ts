import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("skeleton grid", () => {
  it("ships a reusable SkeletonGrid component with shimmer animation", () => {
    const source = read("src/components/SkeletonGrid.tsx");
    expect(source).toContain("SkeletonGrid");
    expect(source).toContain('role="status"');
    expect(source).toContain("aria-live");
    expect(source).toContain("skeleton-grid-item");
  });

  it("defines shimmer keyframes in the global stylesheet", () => {
    const css = read("src/styles/sections.css");
    expect(css).toContain(".skeleton-grid");
    expect(css).toContain("@keyframes skeleton-shimmer");
    expect(css).toContain("background-size: 200% 100%");
  });
});
