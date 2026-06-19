import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("bundle analyzer", () => {
  it("ships a build-time analyzer that categorizes and gzips every asset", () => {
    const source = read("scripts/analyze-bundle.mjs");
    expect(source).toContain("gzipSync");
    expect(source).toContain("classify");
    expect(source).toContain("main-js");
    expect(source).toContain("main-css");
    expect(source).toContain("lazy-js");
    expect(source).toContain("bundle-report.json");
  });

  it("is wired into the build:full pipeline after the perf budget", () => {
    const pkg = read("package.json");
    expect(pkg).toContain("bundle:analyze");
    expect(pkg).toMatch(/perf:budget && npm run bundle:analyze/);
  });
});
