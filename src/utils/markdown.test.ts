import { describe, expect, it } from "vitest";
import { parseMarkdown } from "./markdown";

describe("parseMarkdown", () => {
  it("renders unordered list items in one list without break elements", () => {
    expect(parseMarkdown("- First\n- Second")).toBe(
      "<ul><li>First</li><li>Second</li></ul>",
    );
  });

  it("renders ordered list items in one list without break elements", () => {
    expect(parseMarkdown("1. First\n2. Second")).toBe(
      "<ol><li>First</li><li>Second</li></ol>",
    );
  });

  it("keeps paragraphs well formed around a list", () => {
    expect(parseMarkdown("Intro\n\n- First\n- Second\n\nOutro")).toBe(
      "<p>Intro</p><ul><li>First</li><li>Second</li></ul><p>Outro</p>",
    );
  });

  it("keeps fenced code content literal", () => {
    const markdown = ["```", "- not a list", "**not bold**", "```"].join("\n");

    expect(parseMarkdown(markdown)).toBe(
      "<pre><code>- not a list\n**not bold**</code></pre>",
    );
  });

  it("keeps inline code content literal", () => {
    expect(parseMarkdown("Use `**literal**` here")).toBe(
      "<p>Use <code>**literal**</code> here</p>",
    );
  });

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
