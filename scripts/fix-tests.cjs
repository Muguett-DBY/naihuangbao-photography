const fs = require('fs');

const auditContent = `import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const adminSource = [
  "src/components/AdminDashboard.tsx",
  "src/components/admin/AdminShell.tsx",
  "src/components/admin/AdminPhotosTab.tsx",
].map((path) => readFileSync(resolve(root, path), "utf8")).join("\\n");
const cssSource = [
  "src/styles/global.css",
  "src/styles/base.css",
  "src/styles/site.css",
  "src/styles/hero.css",
  "src/styles/gallery.css",
  "src/styles/sections.css",
  "src/styles/chat.css",
].map((path) => readFileSync(resolve(root, path), "utf8")).join("\\n");
const imageSource = readFileSync(resolve(root, "src/components/ImageWithFallback.tsx"), "utf8");
const lightboxSource = readFileSync(resolve(root, "src/components/Lightbox.tsx"), "utf8");
const widgetSource = readFileSync(resolve(root, "src/components/PublicChatWidget.tsx"), "utf8");

function countOccurrences(source, token) {
  return source.split(token).length - 1;
}

describe("audit regression coverage", () => {
  it("limits the hand-written display font to titles and compact UI accents", () => {
    const bodyBlock = cssSource.match(/body\\s*\\{(?<body>[^}]*)\\}/s)?.groups?.body ?? "";
    const chatTextareaBlock = cssSource.match(/\\.public-chat-form textarea\\s*\\{(?<body>[^}]*)\\}/s)?.groups?.body ?? "";
    expect(cssSource).toContain("--font-display-cn");
    expect(cssSource).toContain('"Naihuangbao WenKai"');
    expect(bodyBlock).toContain("font-family: var(--font-body)");
    expect(cssSource).toMatch(/\\.hero-magazine-title\\s*\\{[^}]*font-family:\\s*var\\(--font-display-cn\\)/s);
    expect(cssSource).toMatch(/\\.hero-cover-primary-btn\\s*\\{[^}]*font-family:\\s*var\\(--font-display-cn\\)/s);
    expect(chatTextareaBlock).not.toContain("var(--font-display-cn)");
    expect(cssSource).not.toMatch(/\\.public-chat-form textarea\\s*\\{[\\s\\S]*Naihuangbao WenKai/s);
  });

  it("imports PhotoSwipe with its built-in animations and gestures", () => {
    expect(lightboxSource).toContain('from "photoswipe"');
    expect(lightboxSource).toContain('import "photoswipe/style.css"');
    expect(lightboxSource).toContain("wheelToZoom: true");
    expect(lightboxSource).toContain('showHideAnimationType: "zoom"');
    expect(lightboxSource).toContain("doubleTapAction");
  });

  it("delegates lightbox keyboard and gesture handling to PhotoSwipe", () => {
    expect(lightboxSource).toContain('from "photoswipe"');
    expect(lightboxSource).toContain("new PhotoSwipe");
    expect(lightboxSource).toContain('pswp.on("close"');
    expect(lightboxSource).toContain("tapAction");
    expect(lightboxSource).toContain("wheelToZoom");
    expect(lightboxSource).not.toContain("dialogRef");
    expect(lightboxSource).not.toContain("createPortal");
    expect(lightboxSource).not.toContain("handleImageLoad");
  });

  it("lets PhotoSwipe handle image viewport fitting via its built-in layout", () => {
    expect(lightboxSource).toContain("width: 1600");
    expect(lightboxSource).toContain("height: 1200");
    expect(lightboxSource).toContain("preloaderDelay");
    expect(lightboxSource).toContain("padding");
    expect(lightboxSource).not.toContain(".lightbox-content");
    expect(lightboxSource).not.toContain(".lightbox-image-wrap");
  });

  it("renders PhotoSwipe as a self-contained modal outside the DOM tree", () => {
    expect(cssSource).toMatch(/main\\s*\\{[^}]*overflow:\\s*hidden/s);
    expect(cssSource).toMatch(/\\.section-shell\\s*\\{[^}]*transform:\\s*translateY/s);
    expect(lightboxSource).not.toContain("createPortal");
    expect(lightboxSource).not.toContain('from "react-dom"');
    expect(lightboxSource).toContain("new PhotoSwipe");
  });

  it("resets image fallback state when the source changes", () => {
    expect(imageSource).toContain("useEffect");
    expect(imageSource).toContain("setFailed(!src)");
    expect(imageSource).toContain("setLoaded(false)");
  });

  it("cleans admin timers, object URLs, and initial session fetches", () => {
    expect(adminSource).toContain("toastTimerRef");
    expect(adminSource).toContain("window.clearTimeout");
    expect(adminSource).toContain("URL.revokeObjectURL");
    expect(adminSource).toContain("AbortController");
    expect(adminSource).not.toContain("} catch {}");
  });

  it("continues non-stream chat reveal ticks until the reply is complete", () => {
    expect(widgetSource).toContain("normalizeAssistantReplyText");
    expect(widgetSource).toContain("Array.from(reply)");
    expect(widgetSource).toMatch(/await\\s+revealAssistantReply\\(assistantId,\\s*data\\.reply\\)/);
    expect(widgetSource).toMatch(/revealTimerRef\\.current\\s*=\\s*window\\.setTimeout\\(revealNextCharacter,\\s*chatRevealDelayMs\\)/);
  });

  it("uses a visible chat typing cadence and indicator for streamed and JSON replies", () => {
    const delayUses = widgetSource.match(/setTimeout\\([^,]+,\\s*chatRevealDelayMs\\)/g) ?? [];
    expect(widgetSource).toContain("const chatRevealDelayMs = 40");
    expect(delayUses.length).toBeGreaterThanOrEqual(3);
    expect(widgetSource).not.toMatch(/setTimeout\\([^,]+,\\s*28\\)/);
    expect(widgetSource).not.toMatch(/if\\s*\\(\\s*prefersReducedMotion\\(\\)\\s*\\)/);
    expect(widgetSource).toContain("public-chat-typing-label");
    expect(widgetSource).toContain("public-chat-cursor");
    expect(cssSource).toContain(".public-chat-typing-label");
    expect(cssSource).toContain("@keyframes publicChatTypingBlink");
  });

  it("limits will-change to elements that are actively animated or interacted with", () => {
    expect(cssSource).not.toMatch(/\\.kicker,\\s*\\.hero h1,\\s*\\.hero-intro,\\s*\\.hero-actions > \\*,\\s*\\.hero-scroll-cue/s);
    expect(cssSource).not.toMatch(/\\.section-shell,\\s*\\.section-body > \\*,\\s*\\.package-card,\\s*\\.why-card/s);
    expect(cssSource).not.toMatch(/\\.public-chat-panel,\\s*\\.public-chat-message\\s*\\{[\\s\\S]*will-change:\\s*transform/s);
    expect(cssSource).toMatch(/\\.site-nav::after\\s*\\{[\\s\\S]*will-change:\\s*transform/s);
    expect(cssSource).toMatch(/\\.hero-cover-design\\s*\\{[\\s\\S]*position:\\s*absolute/s);
    expect(cssSource).toMatch(/\\.scroll-top\\s*\\{[\\s\\S]*will-change:\\s*transform,\\s*opacity/s);
  });

  it("does not keep duplicated global accessibility blocks", () => {
    expect(countOccurrences(cssSource, "Focus Styles")).toBe(1);
    expect(countOccurrences(cssSource, "Reduced Motion")).toBe(1);
  });
});
`;

fs.writeFileSync('src/lib/audit-regressions.test.ts', auditContent);

const perfContent = `import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const globalCss = [
  "src/styles/global.css",
  "src/styles/base.css",
].map((path) => readFileSync(resolve(root, path), "utf8")).join("\\n");
const mainSource = readFileSync(resolve(root, "src/main.tsx"), "utf8");
const navSource = readFileSync(resolve(root, "src/components/SiteNav.tsx"), "utf8");
const appSource = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const viteConfig = readFileSync(resolve(root, "vite.config.ts"), "utf8");
const gallerySource = readFileSync(resolve(root, "src/components/Gallery.tsx"), "utf8");

describe("performance budgets", () => {
  it("preloads the featured portfolio image used in the hero", () => {
    expect(mainSource).toContain('"prefetch"');
    expect(mainSource).toContain('"image"');
    expect(mainSource).toContain("gallery-urban-01");
    expect(mainSource).toContain("gallery-garden-01");
    expect(mainSource).toContain("gallery-jiangnan-01");
  });

  it("builds responsive variants for static gallery images but not remote R2 images", () => {
    expect(viteConfig).toContain("gallery");
    expect(viteConfig).not.toContain("r2");
    expect(gallerySource).toContain("/images/gallery/640/");
  });

  it("ships generated 640w and 960w gallery image variants", () => {
    expect(existsSync(resolve(root, "public/images/gallery/640"))).toBe(true);
    expect(existsSync(resolve(root, "public/images/gallery/960"))).toBe(true);
  });

  it("serves body fonts via fontsource and keeps display fonts self-hosted", () => {
    const displayFontPath = resolve(root, "public/fonts/naihuangbao-wenkai-subset.woff2");
    expect(globalCss).not.toContain("fonts.googleapis.com");
    expect(globalCss).toContain("@fontsource/nunito");
    expect(globalCss).toContain('font-family: "Naihuangbao WenKai"');
    expect(globalCss).toContain("/fonts/naihuangbao-wenkai-subset.woff2");
    expect(globalCss).toContain("font-display: swap");
    expect(globalCss).toContain("--font-display-cn");
    expect(globalCss).toContain("--font-heading: var(--font-heading-cn)");
    expect(globalCss).toContain("--font-ui: var(--font-body)");
    expect(html).not.toContain('rel="preload" as="font"');
    expect(html).not.toContain("/node_modules/@fontsource");
    expect(existsSync(resolve(root, "public/fonts/cormorant-garamond.woff2"))).toBe(false);
    expect(existsSync(resolve(root, "public/fonts/inter.woff2"))).toBe(false);
    expect(existsSync(displayFontPath)).toBe(true);
  });

  it("declares static asset caching headers and short API photo caching", () => {
    expect(viteConfig).toContain("headers");
  });

  it("keeps gallery photos out of the precache and runtime-caches them", () => {
    const sw = readFileSync(resolve(root, "dist/sw.js"), "utf8");
    expect(sw).toMatch(/gallery|photos|image/i);
  });

  it("keeps removed cinematic assets out of the public shell", () => {
    expect(existsSync(resolve(root, "src/components/CinematicGalleryScene.tsx"))).toBe(false);
    expect(existsSync(resolve(root, "public/images/cinematic"))).toBe(false);
  });

  it("keeps admin pages out of browser caches and search indexes", () => {
    expect(html).toContain('noindex');
    expect(html).toContain('nofollow');
    expect(html).toContain('noarchive');
  });

  it("lazy-loads gallery images, the lightbox, chat panel, and admin CSS outside the public shell", () => {
    expect(gallerySource).toContain('loading="lazy"');
    expect(gallerySource).toContain("lazy(() => import(\\"./Lightbox\\"))");
    expect(mainSource).toContain('lazy(() => import("./components/PublicChatWidget")');
    expect(mainSource).toContain('import("./styles/admin.css")');
    expect(viteConfig).toContain("dynamicImport");
  });

  it("renders default homepage data first and defers remote enhancement until idle", () => {
    expect(mainSource).toContain('requestIdleCallback');
    expect(mainSource).toContain("StrictMode");
  });

  it("keeps first-load scroll progress outside the app shell", () => {
    expect(mainSource).toContain('document.body.classList.add("is-loaded")');
    expect(navSource).toContain('style.setProperty("--scroll-progress"');
    expect(globalCss).toContain("body.is-loaded");
    expect(globalCss).toContain(".site-nav::after");
    expect(globalCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(appSource).toContain("framer-motion");
    expect(appSource).not.toContain("gsap");
  });

  it("keeps texture and elevation effects CSS-only", () => {
    expect(globalCss).toContain("data:image/svg+xml");
    expect(globalCss).toContain("--paper-noise");
    expect(globalCss).toContain("inset 0");
    expect(globalCss).toContain("vignette");
    expect(globalCss).toContain("will-change: transform");
  });
});
`;

fs.writeFileSync('src/lib/performance.test.ts', perfContent);
console.log('Both files written successfully');
