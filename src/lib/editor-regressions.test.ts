import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("editor regression contracts", () => {
  it("does not render the public chat overlay on the editor route", () => {
    const rootLayout = read("src/layouts/RootLayout.tsx");

    expect(rootLayout).toContain("const showPublicChat = !isEditor");
    expect(rootLayout).toContain("{showPublicChat &&");
  });

  it("keeps editor image previews bounded and face failures explicit", () => {
    const editor = read("src/pages/PhotoEditorPage.tsx");
    const pagesCss = read("src/styles/pages.css");
    const zhCN = read("src/i18n/locales/zh-CN.json");

    expect(editor).toContain("waitForFaceModels");
    expect(editor).toContain("prepareFaceApiBackend");
    expect(editor).toContain('setBackend?.("cpu")');
    expect(editor).toContain("editor.noFaceDetected");
    expect(pagesCss).toContain("max-height: min(72dvh, 760px)");
    expect(pagesCss).toContain("max-height: 58dvh");
    expect(pagesCss).toContain(".editor-status-warning");
    expect(zhCN).toContain("noFaceDetected");
  });

  it("keeps mobile nav utility controls compact", () => {
    const sectionsCss = read("src/styles/sections.css");
    const heroCss = read("src/styles/hero.css");

    expect(sectionsCss).toContain(".site-nav > .mood-toggle");
    expect(sectionsCss).toContain(".site-nav > .theme-toggle");
    expect(sectionsCss).toContain(".site-nav .nav-login span");
    expect(sectionsCss).toContain("max-width: 44px !important");
    expect(heroCss).toContain(".site-nav > .theme-toggle");
  });

  it("does not parse Vite HTML fallbacks as JSON API data", () => {
    const photosHook = read("src/hooks/usePublicPhotos.tsx");
    const contentHook = read("src/hooks/useSiteContent.tsx");

    expect(photosHook).toContain('response.headers.get("content-type")');
    expect(contentHook).toContain('response.headers.get("content-type")');
    expect(photosHook).toContain('contentType.includes("application/json")');
    expect(contentHook).toContain('contentType.includes("application/json")');
  });

  it("uses the same map tile provider family for light and dark themes", () => {
    const photoMap = read("src/components/PhotoMap.tsx");

    expect(photoMap).toContain("basemaps.cartocdn.com/dark_all");
    expect(photoMap).toContain("basemaps.cartocdn.com/light_all");
    expect(photoMap).not.toContain("tile.openstreetmap.org");
  });
});
