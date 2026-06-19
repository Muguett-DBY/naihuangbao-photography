import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("SEO static files", () => {
  it("blocks /admin /dashboard /editor /login /api from all crawlers", () => {
    const robots = read("public/robots.txt");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /dashboard");
    expect(robots).toContain("Disallow: /editor");
    expect(robots).toContain("Disallow: /login");
    expect(robots).toContain("Disallow: /api/");
  });

  it("publishes Sitemap pointers in robots.txt", () => {
    const robots = read("public/robots.txt");
    expect(robots).toContain("Sitemap: https://shoot.custard.top/sitemap.xml");
    expect(robots).toContain("Sitemap: https://shoot.custard.top/sitemap-index.xml");
  });

  it("applies a polite Crawl-delay to major AI training crawlers", () => {
    const robots = read("public/robots.txt");
    expect(robots).toContain("User-agent: GPTBot");
    expect(robots).toContain("Crawl-delay: 10");
    expect(robots).toContain("User-agent: ClaudeBot");
    expect(robots).toContain("User-agent: anthropic-ai");
    expect(robots).toContain("User-agent: PerplexityBot");
  });

  it("blocks the most aggressive AI scrapers outright", () => {
    const robots = read("public/robots.txt");
    expect(robots).toContain("User-agent: Bytespider");
    expect(robots).toMatch(/User-agent: Bytespider[\s\S]*?Disallow: \//);
  });

  it("enriches the PWA manifest with categories, description, and screenshots", () => {
    const manifest = JSON.parse(read("public/manifest.webmanifest"));
    expect(manifest.name).toContain("南京女生写真");
    expect(manifest.description.length).toBeGreaterThan(20);
    expect(manifest.categories).toContain("photo");
    expect(manifest.theme_color).toBeTruthy();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  });
});
