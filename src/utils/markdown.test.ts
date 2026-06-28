import { describe, expect, it } from "vitest";
import { parseMarkdown } from "./markdown";

describe("parseMarkdown", () => {
  it("renders safe HTTPS markdown links", () => {
    expect(parseMarkdown("[Portfolio](https://shoot.custard.top/gallery)")).toContain(
      '<a href="https://shoot.custard.top/gallery" target="_blank" rel="noopener noreferrer">Portfolio</a>',
    );
  });

  it("does not render javascript links as anchors", () => {
    const html = parseMarkdown("[bad](javascript:alert(1))");

    expect(html).not.toContain("<a ");
    expect(html).not.toContain("javascript:");
  });

  it("does not allow link URLs to inject HTML attributes", () => {
    const html = parseMarkdown('[bad](https://example.com" onclick="alert(1))');

    expect(html).not.toContain("onclick");
    expect(html).not.toContain('href="https://example.com"');
  });
});
