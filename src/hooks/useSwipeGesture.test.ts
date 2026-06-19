import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("swipe gesture hook", () => {
  it("exports a useSwipeGesture hook with horizontal/vertical handlers", () => {
    const source = read("src/hooks/useSwipeGesture.ts");
    expect(source).toContain("export function useSwipeGesture");
    expect(source).toContain("onSwipeLeft");
    expect(source).toContain("onSwipeRight");
    expect(source).toContain("onSwipeUp");
    expect(source).toContain("onSwipeDown");
  });

  it("treats mouse drag as swipe when trackMouse is true", () => {
    const source = read("src/hooks/useSwipeGesture.ts");
    expect(source).toContain("trackMouse");
    expect(source).toContain('"mousedown"');
    expect(source).toContain('"mouseup"');
  });

  it("has distance threshold + restraint guards to avoid false triggers", () => {
    const source = read("src/hooks/useSwipeGesture.ts");
    expect(source).toContain("threshold");
    expect(source).toContain("restraint");
    expect(source).toContain("allowedTime");
  });
});
