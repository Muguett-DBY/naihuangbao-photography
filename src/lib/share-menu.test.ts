import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("share menu", () => {
  it("ships a ShareMenu component with multiple social targets and a clipboard fallback", () => {
    const source = read("src/components/ShareMenu.tsx");
    expect(source).toContain("ShareMenu");
    expect(source).toContain("twitter.com/intent/tweet");
    expect(source).toContain("facebook.com/sharer");
    expect(source).toContain("weibo.com/share");
    expect(source).toContain("linkedin.com/sharing");
    expect(source).toContain("navigator.clipboard.writeText");
    expect(source).toContain("useToast");
    expect(source).toContain("Escape");
  });

  it("wires ShareMenu into the photo detail page in place of the simple share button", () => {
    const source = read("src/pages/PhotoDetailPage.tsx");
    expect(source).toContain("ShareMenu");
    expect(source).not.toContain("const handleShare");
  });

  it("upgrades the gallery ShareButton to use the new ShareMenu with toast feedback", () => {
    const source = read("src/components/Gallery.tsx");
    expect(source).toContain("ShareMenu");
    expect(source).not.toContain("navigator.share(shareData)");
    expect(source).not.toContain("alert(t(\"gallery.linkCopied\"))");
  });

  it("ships localized share labels in every locale", () => {
    for (const localePath of [
      "src/i18n/locales/zh-CN.json",
      "src/i18n/locales/en.json",
      "src/i18n/locales/ja.json",
      "src/i18n/locales/ko.json",
    ]) {
      const locale = JSON.parse(read(localePath));
      expect(locale.share.label).toBeTruthy();
      expect(locale.share.system).toBeTruthy();
      expect(locale.share.copy).toBeTruthy();
      expect(locale.share.copied).toBeTruthy();
      expect(locale.share.copyFailed).toBeTruthy();
    }
  });
});
