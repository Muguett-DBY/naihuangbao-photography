import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("scroll reveal", () => {
  it("ships a useReveal hook that uses IntersectionObserver and respects reduced motion", () => {
    const source = read("src/hooks/useReveal.ts");
    expect(source).toContain("useReveal");
    expect(source).toContain("IntersectionObserver");
    expect(source).toContain("prefers-reduced-motion");
    expect(source).toContain("is-revealed");
  });

  it("defines fade-up reveal styles with custom distance and delay CSS variables", () => {
    const css = read("src/styles/base.css");
    expect(css).toContain(".reveal-on-scroll");
    expect(css).toContain("--reveal-distance");
    expect(css).toContain("--reveal-delay");
    expect(css).toContain("cubic-bezier(0.22, 1, 0.36, 1)");
  });

  it("wires the home service journal into scoped motion groups", () => {
    const home = read("src/pages/HomePage.tsx");
    const services = read("src/components/ServiceJournal.tsx");

    expect(home).toContain("useGsapPageEffects(rootRef)");
    expect(home).toContain("<ServiceJournal />");
    expect(home).not.toContain("useReveal");
    expect(services).toContain("data-motion-group");
    expect(services).toContain("data-motion-item");
  });
});
