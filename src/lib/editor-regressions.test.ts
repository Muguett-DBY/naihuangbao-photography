import { existsSync, readFileSync } from "node:fs";
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
    const photoProcessing = read("src/lib/photo-processing.ts");
    const pagesCss = read("src/styles/pages.css");
    const zhCN = read("src/i18n/locales/zh-CN.json");

    expect(editor).toContain("waitForFaceModels");
    expect(photoProcessing).toContain("prepareFaceApiBackend");
    expect(photoProcessing).toContain('setBackend?.("cpu")');
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

  it("keeps photo detail pages out of the full-height home hero layout", () => {
    const detailPage = read("src/pages/PhotoDetailPage.tsx");
    const pagesCss = read("src/styles/pages.css");

    expect(detailPage).toContain('className="photo-detail-hero"');
    expect(detailPage).not.toContain('className="hero"');
    expect(pagesCss).toContain(".photo-detail-hero");
    expect(pagesCss).toContain("calc(var(--nav-h, 64px) + 16px)");
  });

  it("avoids direct 404 detail fetches for empty future catalog routes", () => {
    const presetDetail = read("src/pages/PresetDetailPage.tsx");
    const workshopDetail = read("src/pages/WorkshopDetailPage.tsx");
    const shopDetail = read("src/pages/ShopDetailPage.tsx");

    // Detail pages now use useApiItem hook with direct detail endpoints
    // and useRelatedItems hook for related items (which internally fetches the list)
    expect(presetDetail).toContain("/api/presets/${id}");
    expect(presetDetail).toContain("useRelatedItems");
    expect(workshopDetail).toContain("/api/workshops/${id}");
    expect(shopDetail).toContain("/api/merchandise/${id}");
    expect(shopDetail).toContain("useRelatedItems");
  });

  it("self-hosts complete face-api models and keeps model loading separate from no-face results", () => {
    const editor = read("src/pages/PhotoEditorPage.tsx");

    expect(editor).toContain('const MODEL_URL = "/models"');
    expect(editor).not.toContain("justadudewhohacks.github.io");
    expect(editor).not.toContain('new Error("Model loading timed out")');
    expect(editor).toContain("faceModelsPromiseRef");
    expect(editor).toContain("detectFaceLandmarks");
    expect(existsSync(resolve(root, "public/models/tiny_face_detector_model-shard1"))).toBe(true);
    expect(existsSync(resolve(root, "public/models/face_landmark_68_model-shard1"))).toBe(true);
  });

  it("normalizes face landmark bounds before writing canvas pixels", () => {
    const editor = read("src/lib/editor-effects.ts");

    expect(editor).toContain("Math.floor(Math.min(...lm.map((p) => p.x)))");
    expect(editor).toContain("Math.floor(Math.max(0, eCY - eR * 2))");
    expect(editor).toContain("Math.floor(Math.max(0, nCY - nR))");
    expect(editor).toContain("Math.floor(Math.max(0, lipCY - 15))");
    expect(editor.match(/\/\/ 10\. Dark circles/g) ?? []).toHaveLength(1);
  });
});
