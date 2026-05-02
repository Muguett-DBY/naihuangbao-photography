import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const adminSource = readFileSync(resolve(root, "src/components/AdminDashboard.tsx"), "utf8");
const cssSource = readFileSync(resolve(root, "src/styles/global.css"), "utf8");
const imageSource = readFileSync(resolve(root, "src/components/ImageWithFallback.tsx"), "utf8");
const lightboxSource = readFileSync(resolve(root, "src/components/Lightbox.tsx"), "utf8");
const widgetSource = readFileSync(resolve(root, "src/components/PublicChatWidget.tsx"), "utf8");

function countOccurrences(source: string, token: string) {
  return source.split(token).length - 1;
}

describe("audit regression coverage", () => {
  it("keeps the lightbox fade animation paired with its keyframes and reduced-motion override", () => {
    expect(cssSource).toContain("@keyframes lightboxFade");
    expect(cssSource).toMatch(/\.lightbox-image\.is-loaded\s*\{[^}]*animation:\s*lightboxFade/s);
    expect(cssSource).toMatch(/prefers-reduced-motion:[^)]+reduce[\s\S]*\.lightbox-image[\s\S]*animation:\s*none\s*!important/);
  });

  it("keeps the lightbox modal keyboard-safe while tracking image load state", () => {
    expect(lightboxSource).toContain("dialogRef");
    expect(lightboxSource).toContain("previousActiveElementRef");
    expect(lightboxSource).toContain('case "Tab"');
    expect(lightboxSource).toContain("querySelectorAll<HTMLElement>");
    expect(lightboxSource).toContain("imageLoadState");
    expect(lightboxSource).toContain("handleImageLoad");
    expect(lightboxSource).toContain("handleImageError");
    expect(lightboxSource).toContain("isImageLoaded");
    expect(lightboxSource).toContain("lightbox-spinner");
    expect(lightboxSource).toContain("is-loaded");
    expect(cssSource).toMatch(/\.lightbox-image\s*\{[^}]*opacity:\s*0/s);
    expect(cssSource).toContain(".lightbox-image.is-loaded");
    expect(cssSource).toContain(".lightbox-loading");
    expect(cssSource).toContain(".lightbox-spinner");
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
    expect(widgetSource).toContain("scheduleNextReveal");
    expect(widgetSource).toMatch(/index\s*<\s*reply\.length[\s\S]*scheduleNextReveal\(\)/);
  });

  it("uses a visible chat typing cadence and indicator for streamed and JSON replies", () => {
    const delayUses = widgetSource.match(/setTimeout\([^,]+,\s*chatRevealDelayMs\)/g) ?? [];

    expect(widgetSource).toContain("const chatRevealDelayMs = 55");
    expect(delayUses.length).toBeGreaterThanOrEqual(3);
    expect(widgetSource).not.toMatch(/setTimeout\([^,]+,\s*28\)/);
    expect(widgetSource).toContain("public-chat-typing-label");
    expect(widgetSource).toContain("public-chat-cursor");
    expect(cssSource).toContain(".public-chat-typing-label");
    expect(cssSource).toContain("@keyframes publicChatTypingBlink");
  });

  it("does not keep duplicated global accessibility blocks", () => {
    expect(countOccurrences(cssSource, "Accessibility: Focus Styles")).toBe(1);
    expect(countOccurrences(cssSource, "Accessibility: Reduced Motion")).toBe(1);
  });
});
