import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { archiveProjects } from "../data/living-archive";
import { galleryItems } from "../data/gallery";
import { primaryNavigation, practiceNavigation } from "../data/product-navigation";
import { INITIAL } from "../data/editor-constants";
import { createCompositionSlots, getCompositionSize, type CompositionMode } from "./composition-layout";
import { createEditorProjectFile, parseEditorProjectFile, type EditorProjectSnapshot } from "./editor-project-store";
import { createArchiveView } from "./living-archive";
import { getResponsivePictureAttrs } from "./responsive-picture";
import { resolveViewTransitionKind } from "./view-transition";

describe("NHB platform v3 contracts", () => {
  it("keeps concept studies complete and separate from authorized real work", () => {
    const realIds = new Set(galleryItems.map((photo) => photo.id));
    expect(archiveProjects).toHaveLength(6);
    expect(new Set(archiveProjects.map((project) => project.id)).size).toBe(archiveProjects.length);
    for (const project of archiveProjects) {
      expect(project.kind).toBe("concept");
      expect(project.media.length).toBeGreaterThan(0);
      expect(realIds.has(project.id)).toBe(false);
      for (const media of project.media) {
        expect(media.src).toMatch(/^\/images\/optical-archive\/.+\.webp$/);
        expect(media.width).toBeGreaterThanOrEqual(1122);
        expect(media.height).toBeGreaterThanOrEqual(900);
      }
    }
  });

  it("filters the archive without mutating the source and exposes every facet", () => {
    const result = createArchiveView(archiveProjects, { mood: "雨后" });
    expect(result.projects.length).toBeGreaterThan(0);
    expect(result.projects.every((project) => project.moods.includes("雨后"))).toBe(true);
    expect(result.facets.palette).toContain("奶油");
    expect(archiveProjects).toHaveLength(6);
  });

  it("builds AVIF and WebP responsive sources for optical archive images", () => {
    const picture = getResponsivePictureAttrs(
      "/images/optical-archive/optical-garden-hero-v1.webp?v=test",
      "100vw",
    );
    expect(picture.sources.map((source) => source.type)).toEqual(["image/avif", "image/webp"]);
    expect(picture.sources[0].srcSet).toContain("/images/optical-archive/640/optical-garden-hero-v1.avif?v=test 640w");
    expect(picture.sources[1].srcSet).toContain("1672w");
  });

  it("ships a deterministic validated archive manifest", () => {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "public/archive-manifest.json"), "utf8"));
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.projects).toHaveLength(6);
    expect(manifest.projects.flatMap((project: { media: unknown[] }) => project.media)).toHaveLength(13);
  });

  it("keeps composition slots bounded for every export format", () => {
    const modes: CompositionMode[] = ["filmstrip", "contact-sheet", "postcard", "moodboard"];
    for (const mode of modes) {
      const size = getCompositionSize(mode);
      const slots = createCompositionSlots(mode, 12);
      expect(slots.length).toBeGreaterThan(0);
      expect(slots.length).toBeLessThanOrEqual(12);
      for (const slot of slots) {
        expect(slot.x).toBeGreaterThanOrEqual(0);
        expect(slot.y).toBeGreaterThanOrEqual(0);
        expect(slot.x + slot.width).toBeLessThanOrEqual(size.width);
        expect(slot.y + slot.height).toBeLessThanOrEqual(size.height);
      }
    }
  });

  it("round-trips a portable local editor project", async () => {
    const project: EditorProjectSnapshot = {
      id: "autosave",
      version: 1,
      name: "test-study",
      fileName: "source.webp",
      source: new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/webp" }),
      settings: { ...INITIAL, temperature: 18 },
      history: [{ ...INITIAL }, { ...INITIAL, temperature: 18 }],
      historyIndex: 1,
      frameId: "film",
      texts: [{ id: "text-1", text: "NHB", x: 10, y: 20, size: 24, color: "#ffffff" }],
      stickers: [],
      savedAt: 1_800_000_000_000,
    };
    const restored = await parseEditorProjectFile(await createEditorProjectFile(project));
    expect(restored.settings.temperature).toBe(18);
    expect(restored.frameId).toBe("film");
    expect(restored.texts[0].text).toBe("NHB");
    expect(Array.from(new Uint8Array(await restored.source.arrayBuffer()))).toEqual([1, 2, 3, 4]);
  });

  it("defines a unique primary IA and route-specific transition intents", () => {
    const paths = [...primaryNavigation, ...practiceNavigation].map((route) => route.to);
    expect(new Set(primaryNavigation.map((route) => route.to)).size).toBe(primaryNavigation.length);
    expect(paths).toContain("/archive");
    expect(paths).toContain("/studio");
    expect(resolveViewTransitionKind("/archive", "/gallery/gallery-jiangnan-01")).toBe("photo-deepen");
    expect(resolveViewTransitionKind("/gallery/gallery-jiangnan-01", "/archive")).toBe("photo-return");
    expect(resolveViewTransitionKind("/lab", "/studio")).toBe("create");
  });
});
