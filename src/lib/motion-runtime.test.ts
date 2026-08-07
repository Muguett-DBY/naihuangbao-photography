import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("motion runtime boundaries", () => {
  it("keeps the global shell on native scrolling without an eager animation runtime", () => {
    const source = read("src/hooks/useGlobalVisualEffects.ts");
    const packageSource = read("package.json");

    expect(source).toContain('document.body.classList.add("is-loaded")');
    expect(source).not.toContain("gsap");
    expect(source).not.toContain("ScrollTrigger");
    expect(source).not.toContain("Lenis");
    expect(packageSource).not.toContain('"lenis"');
  });

  it("reveals explicit groups with observers and finite Web Animations", () => {
    const source = read("src/hooks/usePageRevealEffects.ts");

    expect(source).toContain("IntersectionObserver");
    expect(source).toContain("MutationObserver");
    expect(source).toContain("observer?.disconnect()");
    expect(source).toContain("mutationObserver.disconnect()");
    expect(source).toContain("item.animate");
    expect(source).toContain("runningAnimations");
    expect(source).toContain('[data-motion-group]');
    expect(source).toContain('[data-motion-item]');
    expect(source).not.toContain("ScrollTrigger");
    expect(source).not.toContain("mousemove");
    expect(source).not.toContain("rotateY");
  });
});
