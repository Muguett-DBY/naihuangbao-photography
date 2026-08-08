import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { visualStories } from "../data/visual-stories";
import { getResponsivePictureAttrs } from "./responsive-picture";
import {
  createStoryProject,
  createStoryProjectFile,
  parseStoryProjectFile,
} from "./story-project-store";

describe("visual stories v1", () => {
  it("builds three directory-backed concept stories with valid chapters", () => {
    expect(visualStories).toHaveLength(3);
    expect(new Set(visualStories.map((story) => story.id)).size).toBe(visualStories.length);
    for (const story of visualStories) {
      expect(story.concept).toBe(true);
      expect(story.chapters.length).toBeGreaterThanOrEqual(3);
      expect(story.accent).toMatch(/^#[0-9a-f]{6}$/i);
      for (const chapter of story.chapters) {
        expect(["full", "columns", "contact", "quiet"]).toContain(chapter.layout);
        expect(chapter.media.length).toBeGreaterThan(0);
        expect(chapter.media.every((media) => media.src.startsWith("/images/"))).toBe(true);
      }
    }

    const contentRoot = resolve(process.cwd(), "content/stories");
    const directories = readdirSync(contentRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
    expect(directories).toHaveLength(visualStories.length);
    for (const directory of directories) {
      expect(existsSync(resolve(contentRoot, directory.name, "story.json"))).toBe(true);
    }
  });

  it("ships a deterministic public story manifest", () => {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "public/story-manifest.json"), "utf8"));
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.generatedFrom).toBe("content/stories/*/story.json");
    expect(manifest.stories).toHaveLength(3);
    expect(manifest.stories.flatMap((story: { chapters: unknown[] }) => story.chapters)).toHaveLength(12);
  });

  it("builds AVIF and WebP variants for the new visual system", () => {
    const picture = getResponsivePictureAttrs("/images/visual-os-v5/01-dawn-studio.webp", "100vw");
    expect(picture.sources.map((source) => source.type)).toEqual(["image/avif", "image/webp"]);
    expect(picture.sources[0].srcSet).toContain("/images/visual-os-v5/640/01-dawn-studio.avif 640w");
    expect(picture.sources[1].srcSet).toContain("1536w");
  });

  it("round-trips portable story projects", async () => {
    const project = createStoryProject({ name: "Test story", title: "Paper Weather" });
    project.chapters[0].media.push({
      id: "weather-glasshouse-0",
      projectId: "weather-glasshouse",
      src: "/images/visual-os-v5/03-rain-conservatory.webp",
      alt: "Rain conservatory",
    });
    const restored = await parseStoryProjectFile(createStoryProjectFile(project));
    expect(restored.name).toBe("Test story");
    expect(restored.chapters[0].media[0].projectId).toBe("weather-glasshouse");
  });

  it("rejects malformed portable story projects", async () => {
    await expect(parseStoryProjectFile(new Blob([JSON.stringify({ version: 1 })]))).rejects.toThrow("Invalid NHB story project");
  });
});
