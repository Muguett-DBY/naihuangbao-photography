import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("editorial design system", () => {
  it("defines the Field Notes semantic tokens", () => {
    const css = read("src/styles/base.css");
    for (const token of ["--ink", "--newsprint", "--moss", "--coral", "--font-note", "--radius-card"]) {
      expect(css).toContain(token);
    }
    expect(css).not.toContain("hero-glow-orb");
  });

  it("does not block first paint with the old loading cover", () => {
    const layout = read("src/layouts/RootLayout.tsx");
    expect(layout).not.toContain("LoadingScreen");
    expect(layout).toContain("RouteLoadingState");
    expect(layout).toContain('querySelector<HTMLElement>(".hamburger")');
  });

  it("keeps shared appearance controls inside the editorial token system", () => {
    const themeToggle = read("src/components/ThemeToggle.tsx");
    const moodToggle = read("src/components/MoodToggle.tsx");
    const controls = themeToggle + moodToggle;

    for (const token of ["--ink", "--newsprint", "--moss", "--coral"]) {
      expect(themeToggle).toContain(token);
    }
    expect(themeToggle).toContain("lucide-react");
    expect(moodToggle).toContain("lucide-react");
    expect(controls).not.toMatch(/[☀️🌙💻🎨🌿]/u);
    expect(controls).not.toContain("#19c8b9");

    for (const locale of ["en", "ja", "ko", "zh-CN"]) {
      const messages = read(`src/i18n/locales/${locale}.json`);
      expect(messages).not.toMatch(/[☀️🌞🌙💻🖥️]/u);
    }
  });

  it("moves mobile chat access into the navigation drawer without a floating launcher", () => {
    const chatCss = read("src/styles/chat.css");
    const header = read("src/components/shared/Header.tsx");
    const layout = read("src/layouts/RootLayout.tsx");
    const shellCss = read("src/styles/sections.css");

    expect(header).toContain("onOpenChat");
    expect(layout).toContain("<Header onOpenChat=");
    expect(chatCss).toMatch(/@media \(max-width: 768px\)[\s\S]*\.public-chat-launcher \{\s*display: none;/);
    expect(shellCss).toContain("padding-bottom: var(--mobile-bottom-nav-offset)");
  });

  it("uses opaque masthead and mobile rail surfaces without backdrop blur", () => {
    const mastheadCss = read("src/styles/hero.css");
    const shellCss = read("src/styles/sections.css");

    expect(mastheadCss).not.toMatch(/[^{}]*\.site-nav[^{}]*\{[^{}]*backdrop-filter/s);
    expect(shellCss).not.toMatch(/[^{}]*\.mobile-bottom-nav[^{}]*\{[^{}]*backdrop-filter/s);
    expect(mastheadCss).toMatch(/\/\* Editorial masthead[\s\S]*background: var\(--newsprint\);/);
    expect(shellCss).toMatch(/\.mobile-bottom-nav\s*\{[^{}]*background: var\(--paper\);/s);
  });

  it("keeps task-owned shell and chat touch targets at least 44px", () => {
    const chatCss = read("src/styles/chat.css");
    const mastheadCss = read("src/styles/hero.css");
    const shellCss = read("src/styles/sections.css");

    expect(mastheadCss).toMatch(/\.brand-mark,\s*\.site-nav\.is-scrolled \.brand-mark\s*\{[^{}]*min-height: 44px;/s);
    expect(mastheadCss).toMatch(/\.site-nav \.nav-menu--inline a,\s*\.site-nav\.is-scrolled \.nav-menu--inline a\s*\{[^{}]*min-width: 44px;[^{}]*min-height: 44px;/s);
    expect(mastheadCss).toMatch(/\.site-nav \.nav-cta,\s*\.site-nav\.is-scrolled \.nav-cta\s*\{[^{}]*min-width: 44px;[^{}]*min-height: 44px;/s);
    expect(mastheadCss).toMatch(/\.nav-user-link\s*\{[^{}]*min-width: 44px;[^{}]*min-height: 44px;/s);
    expect(chatCss).toMatch(/\.public-chat-scroll-down\s*\{[^{}]*width: 44px;[^{}]*height: 44px;/s);
    expect(chatCss).toMatch(/\.public-chat-prompts button,\s*\.public-chat-retry\s*\{[^{}]*min-width: 44px;[^{}]*min-height: 44px;/s);
    expect(shellCss).toMatch(/\.site-footer a\s*\{[^{}]*min-width: 44px;[^{}]*min-height: 44px;/s);
    expect(shellCss).toMatch(/\.nav-drawer-utilities \.nav-utility-controls > button\s*\{[^{}]*min-width: 44px;/s);
    expect(shellCss).toMatch(/\.nav-drawer-actions a,\s*\.nav-drawer-actions button\s*\{[^{}]*min-width: 44px;[^{}]*min-height: 44px;/s);
    expect(shellCss).toMatch(/\.mobile-bottom-nav__item\s*\{[^{}]*min-width: 44px;[^{}]*min-height: 56px;/s);
  });

  it("keeps desktop footer and chat utilities in distinct fixed footprints", () => {
    const shellCss = read("src/styles/sections.css");

    expect(shellCss).toMatch(/\.site-footer \.scroll-top\s*\{[^{}]*right: auto;[^{}]*left: 24px;/s);
  });

  it("renders the configured city in the editorial footer line", () => {
    const footer = read("src/components/shared/Footer.tsx");

    expect(footer).toContain("{siteConfig.city} PORTRAIT FIELD NOTES");
    expect(footer).not.toContain("NANJING PORTRAIT FIELD NOTES");
  });

  it("mounts appearance controls only in the active responsive navigation surface", () => {
    const header = read("src/components/shared/Header.tsx");

    expect(header).toContain('COMPACT_NAVIGATION_QUERY = "(max-width: 980px)"');
    expect(header).toContain("window.matchMedia(COMPACT_NAVIGATION_QUERY)");
    expect(header).toContain("utilityOpen && !compactNavigation");
    expect(header).toContain("drawerOpen && compactNavigation");
  });
});
