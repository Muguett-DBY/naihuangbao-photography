import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const navSource = readFileSync(resolve(process.cwd(), "src/components/SiteNav.tsx"), "utf8");
const cssSource = readFileSync(resolve(process.cwd(), "src/styles/global.css"), "utf8");

describe("mobile site navigation", () => {
  it("exposes the expanded menu state and closes through escape", () => {
    expect(navSource).toContain('id="site-navigation-menu"');
    expect(navSource).toContain('aria-controls="site-navigation-menu"');
    expect(navSource).toContain("aria-expanded={open}");
    expect(navSource).toContain('event.key === "Escape"');
  });

  it("locks page scroll and gives the mobile panel an opaque readable surface", () => {
    expect(navSource).toContain('document.body.classList.toggle("nav-lock", open)');
    expect(cssSource).toContain("body.nav-lock");
    expect(cssSource).toContain(".nav-menu::before");
    expect(cssSource).toContain("box-shadow:");
  });

  it("animates the mobile menu with opacity and transform only", () => {
    expect(cssSource).toContain("transform: translate3d(0, -10px, 0)");
    expect(cssSource).toContain(".nav-menu.is-open");
    expect(cssSource).toContain(".nav-menu.is-open a");
    expect(cssSource).toContain("@media (prefers-reduced-motion: reduce)");
  });
});

describe("gallery filter styles", () => {
  it("keeps the active filter readable while hovered or focused", () => {
    expect(cssSource).toContain(".filter-row .is-active:hover");
    expect(cssSource).toContain(".filter-row .is-active:focus-visible");
    expect(cssSource).toContain("#FFB8A1");
    expect(cssSource).toContain("#8B5E4A");
    expect(cssSource).not.toContain("transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1)");
  });

  it("uses the warm custard palette and polaroid card treatments", () => {
    expect(cssSource).toContain("--custard-bg: #FEF3DD");
    expect(cssSource).toContain("--peach-accent: #FFB8A1");
    expect(cssSource).toContain("--caramel-text: #8B5E4A");
    expect(cssSource).toContain(".hero-card::before");
    expect(cssSource).toContain(".section-heading h2::before");
    expect(cssSource).toContain("border-radius: 26px");
    expect(cssSource).toContain("rgba(255, 184, 161, 0.15)");
  });
});
