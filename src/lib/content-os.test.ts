import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { archiveProjects } from "../data/living-archive";
import { visualAssets } from "../data/visual-assets";
import { visualStories } from "../data/visual-stories";

describe("Visual Content OS", () => {
  it("gives every archive media source one traceable asset", () => {
    const sources = new Set(archiveProjects.flatMap((project) => project.media.map((media) => media.src)));
    expect(visualAssets).toHaveLength(sources.size);
    expect(new Set(visualAssets.map((asset) => asset.id)).size).toBe(visualAssets.length);
    expect(visualAssets.every((asset) => asset.projectIds.length > 0)).toBe(true);
    expect(visualAssets.every((asset) => asset.provenance.sourceAsset)).toBe(true);
    expect(visualAssets.filter((asset) => asset.src.includes("visual-os-v6"))).toHaveLength(7);
  });

  it("links story media back to registered assets", () => {
    const sources = new Set(visualAssets.map((asset) => asset.src));
    const storyMedia = visualStories.flatMap((story) => story.chapters.flatMap((chapter) => chapter.media));
    expect(storyMedia.every((media) => sources.has(media.src))).toBe(true);
    expect(visualAssets.some((asset) => asset.storyLinks.length > 0)).toBe(true);
  });

  it("keeps the build command in the production content pipeline", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
    expect(pkg.scripts.build).toContain("content:build");
    expect(readFileSync(resolve(process.cwd(), "scripts/build-content-os.mjs"), "utf8")).toContain("personal-practice");
  });
});
