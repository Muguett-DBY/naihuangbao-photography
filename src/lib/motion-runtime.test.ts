import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("motion runtime boundaries", () => {
  it("cleans up the Lenis ticker and leaves touch scrolling native", () => {
    const source = read("src/hooks/useGsapGlobalEffects.ts");

    expect(source).toContain("gsap.ticker.add(tickerFrame)");
    expect(source).toContain("gsap.ticker.remove(tickerFrame)");
    expect(source).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(source).toContain('matchMedia("(pointer: coarse)")');
    expect(source).toContain("syncTouch: false");
    expect(source).not.toContain("lagSmoothing(0)");
  });

  it("limits page motion to explicit groups without global trigger or pointer listeners", () => {
    const source = read("src/hooks/useGsapPageEffects.ts");

    expect(source).toContain("gsap.context");
    expect(source).toContain("MutationObserver");
    expect(source).toContain("observer.disconnect()");
    expect(source).toContain('[data-motion-group]');
    expect(source).toContain('[data-motion-item]');
    expect(source).toContain("once: true");
    expect(source).not.toContain("ScrollTrigger.getAll");
    expect(source).not.toContain("mousemove");
    expect(source).not.toContain("rotateY");
    expect(source).not.toContain("float-element");
    expect(source).not.toContain("hero-glow-orb");
  });
});
