import type { ReactNode } from "react";

/**
 * Highlights matching text within a string.
 * Wraps matches in <mark> tags for visual emphasis.
 *
 * Usage:
 *   <HighlightText text="Jiangnan Garden" query="garden" />
 */
export function HighlightText({
  text,
  query,
  className = "highlight",
}: {
  text: string;
  query: string;
  className?: string;
}): ReactNode {
  if (!query.trim() || !text) {
    return <>{text}</>;
  }

  const q = query.trim().toLowerCase();
  const lowerText = text.toLowerCase();
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  let index = lowerText.indexOf(q);
  while (index !== -1) {
    // Add text before match
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }
    // Add highlighted match
    parts.push(
      <mark key={index} className={className}>
        {text.slice(index, index + q.length)}
      </mark>,
    );
    lastIndex = index + q.length;
    index = lowerText.indexOf(q, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
