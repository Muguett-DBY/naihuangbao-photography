import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const adminSource = [
  "src/components/AdminDashboard.tsx",
  "src/components/admin/AdminShell.tsx",
].map((path) => readFileSync(resolve(root, path), "utf8")).join("\n");
const cssSource = [
  "src/styles/global.css",
  "src/styles/base.css",
  "src/styles/site.css",
  "src/styles/hero.css",
  "src/styles/gallery.css",
  "src/styles/sections.css",
  "src/styles/chat.css",
].map((path) => readFileSync(resolve(root, path), "utf8")).join("\n");
const imageSource = readFileSync(resolve(root, "src/components/ImageWithFallback.tsx"), "utf8");
const lightboxSource = readFileSync(resolve(root, "src/components/Lightbox.tsx"), "utf8");
const widgetSource = readFileSync(resolve(root, "src/components/PublicChatWidget.tsx"), "utf8");

function countOccurrences(source: string, token: string) {
  return source.split(token).length - 1;
}

describe("audit regression coverage", () => {
  it("limits the hand-written display font to titles and compact UI accents", () => {
    const bodyBlock = cssSource.match(/body\s*\{(?<body>[^}]*)\}/s)?.groups?.body ?? "";
    const chatTextareaBlock = cssSource.match(/\.public-chat-form textarea\s*\{(?<body>[^}]*)\}/s)?.groups?.body ?? "";

    expect(cssSource).toContain("--font-display-cn");
    expect(cssSource).toContain('"Naihuangbao WenKai"');
    expect(bodyBlock).toContain("font-family: var(--font-body)");
    expect(cssSource).toMatch(/\.hero-magazine-title\s*\{[^}]*font-family:\s*var\(--font-display-cn\)/s);
    expect(cssSource).toMatch(/\.hero-cover-primary-btn\s*\{[^}]*font-family:\s*var\(--font-display-cn\)/s);
    expect(chatTextareaBlock).not.toContain("var(--font-display-cn)");
    expect(cssSource).not.toMatch(/\.public-chat-form textarea\s*\{[\s\S]*Naihuangbao WenKai/s);
  });

  it("keeps the lightbox fade animation paired with its keyframes and reduced-motion override", () => {
    expect(cssSource).toContain("@keyframes lightboxFade");
    expect(cssSource).toMatch(/\.lightbox-image\.is-loaded\s*\{[^}]*animation:\s*lightboxFade/s);
    expect(cssSource).toMatch(/@keyframes lightboxFade\s*\{[\s\S]*opacity:\s*1/s);
    expect(cssSource).toMatch(/prefers-reduced-motion:[^)]+reduce[\s\S]*\.lightbox-image[\s\S]*animation:\s*none\s*!important/);
  });

  it("keeps the lightbox modal keyboard-safe while tracking cached image load state", () => {
    expect(lightboxSource).toContain("dialogRef");
    expect(lightboxSource).toContain("previousActiveElementRef");
    expect(lightboxSource).toContain('case "Tab"');
    expect(lightboxSource).toContain("querySelectorAll<HTMLElement>");
    expect(lightboxSource).toContain("useLayoutEffect");
    expect(lightboxSource).toContain("readImageElementStatus");
    expect(lightboxSource).toContain("imageLoadState");
    expect(lightboxSource).toContain("handleImageLoad");
    expect(lightboxSource).toContain("handleImageError");
    expect(lightboxSource).toContain("isImageLoaded");
    expect(lightboxSource).toContain("lightbox-spinner");
    expect(lightboxSource).toContain("is-loaded");
    expect(cssSource).toMatch(/\.lightbox-overlay\s*\{(?=[^}]*position:\s*fixed)(?=[^}]*inset:\s*0)(?=[^}]*z-index:\s*9999)(?=[^}]*display:\s*flex)(?=[^}]*align-items:\s*center)(?=[^}]*justify-content:\s*center)/s);
    expect(cssSource).not.toMatch(/\.lightbox-image\s*\{[^}]*opacity:\s*0/s);
    expect(cssSource).toMatch(/\.lightbox-image\s*\{[^}]*opacity:\s*1/s);
    expect(cssSource).toContain(".lightbox-image.is-loaded");
    expect(cssSource).toMatch(/\.lightbox-image-wrap\s*\{[^}]*max-height:\s*calc\(100dvh - 130px\)/s);
    expect(cssSource).toContain(".lightbox-loading");
    expect(cssSource).toMatch(/\.lightbox-loading,\s*\.lightbox-image-error\s*\{[^}]*z-index:\s*2/s);
    expect(cssSource).toContain(".lightbox-spinner");
  });

  it("bounds lightbox images to the viewport stage instead of percentage max-height", () => {
    const lightboxContentBlock = cssSource.match(/\.lightbox-content\s*\{(?<body>[^}]*)\}/s)?.groups?.body ?? "";
    const lightboxWrapBlock = cssSource.match(/\.lightbox-image-wrap\s*\{(?<body>[^}]*)\}/s)?.groups?.body ?? "";
    const lightboxImageBlock = cssSource.match(/\.lightbox-image\s*\{(?<body>[^}]*)\}/s)?.groups?.body ?? "";

    expect(lightboxContentBlock).toContain("width: min(80vw, 1080px)");
    expect(lightboxWrapBlock).toContain("display: flex");
    expect(lightboxWrapBlock).toContain("align-items: center");
    expect(lightboxWrapBlock).toContain("justify-content: center");
    expect(lightboxWrapBlock).toContain("height: min(72dvh, 720px)");
    expect(lightboxWrapBlock).toContain("overflow: hidden");
    expect(lightboxImageBlock).toContain("width: auto");
    expect(lightboxImageBlock).toContain("height: auto");
    expect(lightboxImageBlock).toContain("max-width: 100%");
    expect(lightboxImageBlock).toContain("max-height: 100%");
    expect(lightboxImageBlock).not.toMatch(/^\s*width:\s*100%/m);
    expect(lightboxImageBlock).not.toMatch(/^\s*height:\s*100%/m);
    expect(lightboxImageBlock).toContain("object-fit: contain");
  });

  it("mounts the lightbox outside transformed gallery containers", () => {
    expect(cssSource).toMatch(/main\s*\{[^}]*overflow:\s*hidden/s);
    expect(cssSource).toMatch(/\.section-shell\s*\{[^}]*transform:\s*translateY\(36px\)/s);
    expect(lightboxSource).toContain('from "react-dom"');
    expect(lightboxSource).toContain("createPortal");
    expect(lightboxSource).toMatch(/createPortal\(\s*dialog,\s*document\.body\s*\)/s);
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
    expect(widgetSource).toMatch(/await\s+revealAssistantReply\(assistantId,\s*data\.reply\)/);
    expect(widgetSource).toMatch(/revealTimerRef\.current\s*=\s*window\.setTimeout\(revealNextCharacter,\s*chatRevealDelayMs\)/);
  });

  it("uses a visible chat typing cadence and indicator for streamed and JSON replies", () => {
    const delayUses = widgetSource.match(/setTimeout\([^,]+,\s*chatRevealDelayMs\)/g) ?? [];

    expect(widgetSource).toContain("const chatRevealDelayMs = 40");
    expect(delayUses.length).toBeGreaterThanOrEqual(3);
    expect(widgetSource).not.toMatch(/setTimeout\([^,]+,\s*28\)/);
    expect(widgetSource).not.toMatch(/if\s*\(\s*prefersReducedMotion\(\)\s*\)/);
    expect(widgetSource).toContain("聊天助手暂时没有返回内容");
    expect(widgetSource).toContain("public-chat-typing-label");
    expect(widgetSource).toContain("public-chat-cursor");
    expect(cssSource).toContain(".public-chat-typing-label");
    expect(cssSource).toContain("@keyframes publicChatTypingBlink");
  });

  it("limits will-change to elements that are actively animated or interacted with", () => {
    expect(cssSource).not.toMatch(/\.kicker,\s*\.hero h1,\s*\.hero-intro,\s*\.hero-actions > \*,\s*\.hero-scroll-cue/s);
    expect(cssSource).not.toMatch(/\.section-shell,\s*\.section-body > \*,\s*\.package-card,\s*\.why-card/s);
    expect(cssSource).not.toMatch(/\.public-chat-panel,\s*\.public-chat-message\s*\{[\s\S]*will-change:\s*transform/s);
    expect(cssSource).toMatch(/\.site-nav::after\s*\{[\s\S]*will-change:\s*transform/s);
    expect(cssSource).toMatch(/\.hero-cover-design\s*\{[\s\S]*position:\s*absolute/s);
    expect(cssSource).toMatch(/\.scroll-top\s*\{[\s\S]*will-change:\s*transform,\s*opacity/s);
  });

  it("does not keep duplicated global accessibility blocks", () => {
    expect(countOccurrences(cssSource, "Focus Styles")).toBe(1);
    expect(countOccurrences(cssSource, "Reduced Motion")).toBe(1);
  });
});
