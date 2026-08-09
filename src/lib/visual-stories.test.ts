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
        expect(["full", "columns", "contact", "quiet", "diptych", "compare", "annotation", "interlude", "constellation"]).toContain(chapter.layout);
        expect(chapter.media.length).toBeGreaterThan(0);
        expect(chapter.media.every((media) => media.src.startsWith("/images/"))).toBe(true);
      }
    }
    const publishedLayouts = new Set(visualStories.flatMap((story) => story.chapters.map((chapter) => chapter.layout)));
    for (const layout of ["diptych", "compare", "annotation", "interlude", "constellation"]) {
      expect(publishedLayouts.has(layout as never)).toBe(true);
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
    expect(restored.version).toBe(2);
    expect(restored.name).toBe("Test story");
    expect(restored.chapters[0].media[0].projectId).toBe("weather-glasshouse");
    expect(restored.chapters[0].scene).toMatchObject({ transition: "veil", durationMs: 850 });
  });

  it("migrates V1 stories to bounded SceneGraph chapter motion", async () => {
    const legacy = {
      id: "legacy-story",
      version: 1,
      projectType: "story",
      name: "Legacy",
      title: "Legacy title",
      subtitle: "",
      accent: "#56705d",
      chapters: [{ id: "chapter-1", kicker: "01", title: "One", body: "Body", layout: "full", media: [] }],
      createdAt: 1,
      savedAt: 2,
    };
    const restored = await parseStoryProjectFile(new Blob([JSON.stringify(legacy)]));
    expect(restored.version).toBe(2);
    expect(restored.chapters[0].scene).toMatchObject({ transition: "veil", focusX: 0.5, focusY: 0.5 });
  });

  it("rejects malformed portable story projects", async () => {
    await expect(parseStoryProjectFile(new Blob([JSON.stringify({ version: 1 })]))).rejects.toThrow("Invalid NHB story project");
  });

  it("ships a draggable dual-device builder and route-specific static SEO pipeline", () => {
    const builder = readFileSync(resolve(process.cwd(), "src/pages/StoryBuilderPage.tsx"), "utf8");
    const timeline = readFileSync(resolve(process.cwd(), "src/components/stories/StoryTimeline.tsx"), "utf8");
    const routeShells = readFileSync(resolve(process.cwd(), "scripts/build-route-shells.mjs"), "utf8");
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
    expect(builder).toContain("readArchiveCollection");
    expect(builder).toContain("previewDevice");
    expect(timeline).toContain("draggable");
    expect(timeline).toContain("onDrop");
    expect(routeShells).toContain("application/ld+json");
    expect(routeShells).toContain("data-static-route-shell");
    expect(pkg.scripts["build:app"]).toContain("seo:routes");
  });
});
