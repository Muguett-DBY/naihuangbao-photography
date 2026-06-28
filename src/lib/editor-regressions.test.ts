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
    const editor = read("src/pages/PhotoEditorWorkspace.tsx");
    const photoProcessing = read("src/lib/photo-processing.ts");
    const pagesCss = read("src/styles/pages.css");
    const zhCN = read("src/i18n/locales/zh-CN.json");

    expect(editor).toContain("waitForFaceModels");
    expect(editor).toContain('import { ErrorBoundary } from "../components/ErrorBoundary"');
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

  it("keeps core mobile destinations persistent without covering overlays", () => {
    const rootLayout = read("src/layouts/RootLayout.tsx");
    const mobileNav = read("src/components/shared/MobileBottomNav.tsx");
    const dashboard = read("src/pages/DashboardPage.tsx");
    const sectionsCss = read("src/styles/sections.css");
    const chatCss = read("src/styles/chat.css");
    const pagesCss = read("src/styles/pages.css");

    expect(rootLayout).toContain("<MobileBottomNav");
    expect(rootLayout).toContain("!isEditor");
    expect(mobileNav).toContain('to="/gallery"');
    expect(mobileNav).toContain('to="/editor"');
    expect(mobileNav).toContain('user ? "/dashboard" : "/login"');
    expect(mobileNav).toContain("openBooking");
    expect(mobileNav).toContain('aria-current={active ? "page" : undefined}');
    expect(dashboard).toContain('to="/editor"');
    expect(dashboard).toContain("dashboard.editorTitle");
    expect(sectionsCss).toContain(".mobile-bottom-nav");
    expect(sectionsCss).toContain("env(safe-area-inset-bottom");
    expect(sectionsCss).toMatch(/\.mobile-bottom-nav\s*\{[\s\S]*z-index:\s*900/s);
    expect(chatCss).toContain("var(--mobile-bottom-nav-offset");
    expect(pagesCss).toContain(".dashboard-editor-card");
    expect(pagesCss).toContain(".nhb-scroll-top");
    expect(pagesCss).toContain("var(--mobile-bottom-nav-offset");
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
    const editor = read("src/pages/PhotoEditorWorkspace.tsx");

    expect(editor).toContain('const MODEL_URL = "/models"');
    expect(editor).not.toContain("justadudewhohacks.github.io");
    expect(editor).not.toContain('new Error("Model loading timed out")');
    expect(editor).toContain("faceModelsPromiseRef");
    expect(editor).toContain("detectFaceLandmarks");
    expect(read("src/lib/editor-utils.ts")).toContain("new api.TinyFaceDetectorOptions");
    expect(existsSync(resolve(root, "public/models/tiny_face_detector_model-shard1"))).toBe(true);
    expect(existsSync(resolve(root, "public/models/face_landmark_68_model-shard1"))).toBe(true);
  });

  it("lets users retry editor model loading and continue in degraded mode", () => {
    const editor = read("src/pages/PhotoEditorWorkspace.tsx");
    const pagesCss = read("src/styles/pages.css");
    const zhCN = read("src/i18n/locales/zh-CN.json");

    expect(editor).toContain("handleRetryModels");
    expect(editor).toContain("editor.modelLoadFailed");
    expect(editor).toContain("editor.degradedMode");
    expect(editor).toContain("editor.retryModels");
    expect(editor).toContain("modelLoadAttempt");
    expect(editor).toContain("setModelError(false)");
    expect(pagesCss).toContain(".editor-model-fallback");
    expect(pagesCss).toContain(".editor-model-retry");
    expect(zhCN).toContain("模型加载失败");
    expect(zhCN).toContain("仍可使用滤镜、文字、边框和导出");
  });

  it("defers face-api model loading until upload or explicit retry", () => {
    const editor = read("src/pages/PhotoEditorWorkspace.tsx");
    const zhCN = read("src/i18n/locales/zh-CN.json");
    const en = read("src/i18n/locales/en.json");

    expect(editor).not.toContain("useEffect(() => startModelLoad(), [startModelLoad, modelLoadAttempt])");
    expect(editor).toContain("startModelLoad({ force: true })");
    expect(editor).toContain("await waitForFaceModels()");
    expect(editor).toContain("editor.modelsDeferred");
    expect(editor).toContain("faceModelsPromiseRef.current = null");
    expect(zhCN).toContain("AI 模型会在上传照片后按需加载");
    expect(en).toContain("AI models load only after you add a photo");
  });

  it("keeps the editor route lightweight until the full studio is requested", () => {
    const editor = read("src/pages/PhotoEditorPage.tsx");
    const workspace = read("src/pages/PhotoEditorWorkspace.tsx");

    expect(editor).toContain('lazy(() => import("./PhotoEditorWorkspace"))');
    expect(editor).toContain("editor-light-shell");
    expect(editor).toContain("editor-toolbar--light");
    expect(editor).toContain('type="file"');
    expect(editor).toContain("setStudioReady(true)");
    expect(editor).toContain("setInitialFile(file)");
    expect(editor).toContain("initialFile={initialFile}");
    expect(editor).not.toContain("../data/editor-constants");
    expect(editor).not.toContain("../lib/editor-effects");
    expect(editor).not.toContain("../lib/photo-processing");
    expect(editor).not.toContain("useRef<HTMLCanvasElement>");

    expect(workspace).toContain("initialFile?: File | null");
    expect(workspace).toContain("loadImageFile(initialFile)");
  });

  it("keeps the editor empty state action-led and mobile-ready", () => {
    const editor = read("src/pages/PhotoEditorPage.tsx");
    const pagesCss = read("src/styles/pages.css");
    const zhCN = read("src/i18n/locales/zh-CN.json");
    const en = read("src/i18n/locales/en.json");

    expect(editor).toContain("ImagePlus");
    expect(editor).toContain("editor-empty-panel");
    expect(editor).toContain("editor-empty-upload");
    expect(editor).toContain("editor-empty-badges");
    expect(editor).toContain("editor.emptyTitle");
    expect(editor).toContain("editor.localOnly");
    expect(pagesCss).toContain(".editor-empty-panel");
    expect(pagesCss).toContain(".editor-empty-upload");
    expect(pagesCss).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*\.editor-empty-badges/s);
    expect(zhCN).toContain("打开一张照片");
    expect(en).toContain("Open a portrait");
  });

  it("prevents the empty editor canvas from squeezing the mobile upload panel", () => {
    const editor = read("src/pages/PhotoEditorWorkspace.tsx");
    const pagesCss = read("src/styles/pages.css");

    expect(editor).toContain("editor-canvas--placeholder");
    expect(editor).toContain('!originalRef.current ? "editor-canvas--placeholder"');
    expect(pagesCss).toContain("width: 100%;");
    expect(pagesCss).toContain(".editor-canvas--placeholder");
    expect(pagesCss).toContain("display: none;");
  });

  it("groups the mobile editor workflow and exposes export recovery status", () => {
    const editor = read("src/pages/PhotoEditorWorkspace.tsx");
    const pagesCss = read("src/styles/pages.css");
    const zhCN = read("src/i18n/locales/zh-CN.json");
    const en = read("src/i18n/locales/en.json");

    expect(editor).toContain("EDITOR_WORKFLOW_GROUPS");
    expect(editor).toContain("activeWorkflowGroup");
    expect(editor).toContain('className="editor-workflow-tabs"');
    expect(editor).toContain('className="editor-workflow-panel"');
    expect(editor).toContain("editor.exportStatus");
    expect(editor).toContain('state: "exporting"');
    expect(editor).toContain('state: "failed"');
    expect(editor).toContain("try {");
    expect(editor).toContain("catch");
    expect(pagesCss).toContain(".editor-workflow-tabs");
    expect(pagesCss).toContain(".editor-workflow-panel");
    expect(pagesCss).toContain(".editor-export-status");
    expect(zhCN).toContain("调色");
    expect(zhCN).toContain("导出失败");
    expect(en).toContain("Color");
    expect(en).toContain("Export failed");
  });

  it("uses existing localized label keys for advanced editor tools", () => {
    const constants = read("src/data/editor-constants.ts");

    expect(constants).not.toContain("editor.blurBg");
    expect(constants).not.toContain("editor.bgRemove");
    expect(constants).not.toContain("editor.localBright");
    expect(constants).not.toContain("editor.colorSplash");
    expect(constants).not.toContain("editor.doubleExposure");
    expect(constants).toContain('labelKey: "editor.blur_bg"');
    expect(constants).toContain('labelKey: "editor.bg_remove"');
    expect(constants).toContain('labelKey: "editor.local_bright"');
    expect(constants).toContain('labelKey: "editor.color_splash"');
    expect(constants).toContain('labelKey: "editor.double_exposure"');
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
