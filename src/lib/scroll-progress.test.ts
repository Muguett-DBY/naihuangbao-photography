import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("scroll progress and reading aids", () => {
  it("ships a scroll progress component with rAF-throttled updates and ARIA progressbar", () => {
    const source = read("src/components/ScrollProgress.tsx");
    expect(source).toContain("export function ScrollProgress");
    expect(source).toContain('role="progressbar"');
    expect(source).toContain("aria-valuemin");
    expect(source).toContain("aria-valuemax");
    expect(source).toContain("aria-valuenow");
    expect(source).toContain("requestAnimationFrame");
  });

  it("mounts the scroll progress bar on non-editor pages", () => {
    const source = read("src/layouts/RootLayout.tsx");
    expect(source).toContain("ScrollProgress");
    expect(source).toContain("!isEditor && <ScrollProgress />");
  });

  it("styles the scroll progress bar with a gradient and a thin fixed bar", () => {
    const css = read("src/styles/base.css");
    expect(css).toContain(".scroll-progress");
    expect(css).toContain(".scroll-progress-bar");
    expect(css).toContain("transform: scaleX");
    expect(css).toContain("linear-gradient(90deg");
  });
});
