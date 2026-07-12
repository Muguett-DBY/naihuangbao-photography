import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("static SEO shell", () => {
  it("publishes readable brand metadata for search engines", () => {
    expect(html).toContain("<title>奶黄包摄影｜南京女生写真与情侣约拍</title>");
    expect(html).toContain('name="description"');
    expect(html).toContain("奶黄包摄影");
    expect(html).toContain("南京女生写真");
    expect(html).toContain("情侣约拍");
    expect(html).toContain("https://shoot.custard.top");
  });

  it("includes crawlable fallback content before React loads", () => {
    const rootMatch = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<script/);

    expect(rootMatch?.[1]).toContain("奶黄包摄影");
    expect(rootMatch?.[1]).toContain("南京女生写真");
    expect(rootMatch?.[1]).toContain("情侣约拍");
    expect(rootMatch?.[1]).toContain("室内写真 50/h");
    expect(rootMatch?.[1]).toContain("室外约拍 60/h");
    expect(rootMatch?.[1]).toContain("小红书私信咨询");
  });

  it("keeps fallback portfolio images inert while JavaScript is enabled", () => {
    const fallback = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<script/)?.[1] ?? "";
    const noscript = fallback.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? "";
    const activeFallback = fallback.replace(/<noscript>[\s\S]*?<\/noscript>/g, "");

    expect(noscript.match(/<img\b/g)).toHaveLength(3);
    expect(activeFallback).not.toContain("<img");
  });

  it("uses ProfessionalService structured data for the photography brand", () => {
    expect(html).toContain('"@type": "ProfessionalService"');
    expect(html).toContain('"name": "奶黄包摄影"');
    expect(html).toContain('"areaServed"');
    expect(html).toContain('"南京"');
  });

  it("publishes WeChat-compatible share metadata", () => {
    expect(html).toContain('property="og:title" content="奶黄包摄影｜南京女生写真与情侣约拍"');
    expect(html).toContain('property="og:image" content="https://shoot.custard.top/wechat-share.jpg"');
    expect(html).toContain('name="twitter:image" content="https://shoot.custard.top/wechat-share.jpg"');
  });

  it("includes preconnect and font preload for faster first paint", () => {
    expect(html).toContain('rel="preconnect" href="https://shoot.custard.top"');
    expect(html).toContain('rel="dns-prefetch" href="https://shoot.custard.top"');
    expect(html).toContain('rel="preload" href="/fonts/naihuangbao-wenkai-subset.woff2"');
  });

  it("links the web app manifest for PWA installs", () => {
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('name="theme-color" content="#F5E6D3"');
  });

  it("keeps Pages preview deployments free of Cloudflare RUM console errors", () => {
    expect(html).toContain("\\.pages\\.dev");
    expect(html).toContain("cloudflareinsights.com/cdn-cgi/rum");
    expect(html).toContain("__nhbSkipCfRum");
  });
});

describe("useSEO dynamic meta", () => {
  it("accepts a custom image and imageAlt and emits them as og:image and og:image:alt", () => {
    const source = read("src/hooks/useSEO.ts");
    expect(source).toContain("imageAlt");
    expect(source).toContain("og:image:alt");
    expect(source).toContain("twitter:image:alt");
  });

  it("passes the photo's own imageUrl to og:image on the photo detail page", () => {
    const source = read("src/pages/PhotoDetailPage.tsx");
    expect(source).toContain("image: photo?.imageUrl");
    expect(source).toContain("imageAlt: photo?.alt");
  });
});
