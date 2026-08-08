import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("scroll reveal", () => {
  it("defines fade-up reveal styles with custom distance and delay CSS variables", () => {
    const css = read("src/styles/base.css");
    expect(css).toContain(".reveal-on-scroll");
    expect(css).toContain("--reveal-distance");
    expect(css).toContain("--reveal-delay");
    expect(css).toContain("cubic-bezier(0.22, 1, 0.36, 1)");
  });

  it("wires the current home closing frame into scoped motion groups", () => {
    const home = read("src/pages/HomePage.tsx");

    expect(home).toContain("usePageRevealEffects(rootRef)");
    expect(home).toContain('id="make-something" data-motion-group');
    expect(home).not.toContain("useReveal");
    expect(home.match(/data-motion-item/g) ?? []).toHaveLength(2);
  });
});
