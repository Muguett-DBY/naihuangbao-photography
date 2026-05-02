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
    expect(cssSource).toMatch(/\.lightbox-image\s*\{[^}]*animation:\s*lightboxFade/s);
    expect(cssSource).toMatch(/prefers-reduced-motion:[^)]+reduce[\s\S]*\.lightbox-image[\s\S]*animation:\s*none\s*!important/);
  });

  it("keeps the lightbox modal keyboard-safe without unused preload state", () => {
    expect(lightboxSource).toContain("dialogRef");
    expect(lightboxSource).toContain("previousActiveElementRef");
    expect(lightboxSource).toContain('case "Tab"');
    expect(lightboxSource).toContain("querySelectorAll<HTMLElement>");
    expect(lightboxSource).not.toContain("const [loaded, setLoaded]");
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

  it("does not keep duplicated global accessibility blocks", () => {
    expect(countOccurrences(cssSource, "Accessibility: Focus Styles")).toBe(1);
    expect(countOccurrences(cssSource, "Accessibility: Reduced Motion")).toBe(1);
  });
});
