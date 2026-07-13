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
    expect(chatCss).toMatch(/@media \(max-width: 640px\)[\s\S]*\.public-chat-launcher \{\s*display: none;/);
    expect(shellCss).toContain("padding-bottom: var(--mobile-bottom-nav-offset)");
  });
});
