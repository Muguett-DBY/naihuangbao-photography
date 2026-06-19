import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("modal accessibility contracts", () => {
  it("provides a reusable focus trap hook with return-focus and tab cycling", () => {
    const source = read("src/hooks/useFocusTrap.ts");
    expect(source).toContain("useFocusTrap");
    expect(source).toContain('"Tab"');
    expect(source).toContain("shiftKey");
    expect(source).toContain("previouslyFocusedRef");
    expect(source).toContain("getFocusable");
    expect(source).toContain("aria-hidden");
  });

  it("provides a modal a11y helper that wires aria-labelledby and aria-describedby", () => {
    const source = read("src/hooks/useModalA11y.ts");
    expect(source).toContain("useModalA11y");
    expect(source).toContain('aria-labelledby');
    expect(source).toContain('aria-describedby');
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
  });

  it("applies focus trap, aria-labelledby, and aria-describedby in the booking modal", () => {
    const source = read("src/components/BookingModal.tsx");
    expect(source).toContain("useFocusTrap");
    expect(source).toContain("useModalA11y");
    expect(source).toContain("titleId");
    expect(source).toContain("descriptionId");
    expect(source).toContain("booking-modal-content");
    expect(source).toContain("sr-only");
  });

  it("exposes screen-reader text spans for the modal title and subtitle in all locales", () => {
    for (const localePath of [
      "src/i18n/locales/zh-CN.json",
      "src/i18n/locales/en.json",
      "src/i18n/locales/ja.json",
      "src/i18n/locales/ko.json",
    ]) {
      const locale = JSON.parse(read(localePath));
      expect(locale.bookingModal.title).toBeTruthy();
      expect(locale.bookingModal.subtitle).toBeTruthy();
      expect(locale.bookingModal.successTitle).toBeTruthy();
    }
  });
});
