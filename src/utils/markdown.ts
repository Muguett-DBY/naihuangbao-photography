/**
 * Simple markdown parser with XSS protection
 * Supports: bold, italic, links, code blocks, lists, headings
 */
export function parseMarkdown(content: string): string {
  if (!content) return "";

  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (isFence(line)) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !isFence(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,4}) (.+)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    const unorderedItem = line.match(/^[\-*] (.+)$/);
    if (unorderedItem) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(/^[\-*] (.+)$/);
        if (!item) break;
        items.push(`<li>${renderInline(item[1])}</li>`);
        index += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    const orderedItem = line.match(/^\d+\. (.+)$/);
    if (orderedItem) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\d+\. (.+)$/);
        if (!item) break;
        items.push(`<li>${renderInline(item[1])}</li>`);
        index += 1;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      if (paragraphLines.length > 0 && isBlockStart(lines[index])) break;
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push(`<p>${paragraphLines.map(renderInline).join("<br>")}</p>`);
  }

  return blocks.join("");
}

function isFence(line: string): boolean {
  return line.trimStart().startsWith("```");
}

function isBlockStart(line: string): boolean {
  return isFence(line)
    || /^(?:#{1,4}|[\-*]) .+$/.test(line)
    || /^\d+\. .+$/.test(line);
}

function renderInline(value: string): string {
  return value
    .split(/(`[^`]*`)/g)
    .map((segment) => {
      if (segment.startsWith("`") && segment.endsWith("`")) {
        return `<code>${escapeHtml(segment.slice(1, -1))}</code>`;
      }
      return renderInlineText(segment);
    })
    .join("");
}

function renderInlineText(value: string): string {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let html = "";
  let cursor = 0;

  for (const match of value.matchAll(linkPattern)) {
    const start = match.index;
    html += renderEmphasis(value.slice(cursor, start));

    const label = renderEmphasis(match[1]);
    const url = sanitizeMarkdownUrl(match[2]);
    html += url
      ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : label;
    cursor = start + match[0].length;
  }

  return html + renderEmphasis(value.slice(cursor));
}

function renderEmphasis(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeMarkdownUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed || /[\u0000-\u001F\u007F\s"'<>]/.test(trimmed)) return null;

  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return escapeHtml(trimmed);
  }

  try {
    const url = new URL(trimmed);
    if (["https:", "http:", "mailto:", "tel:"].includes(url.protocol)) {
      return escapeHtml(trimmed);
    }
  } catch {
    return null;
  }

  return null;
}
