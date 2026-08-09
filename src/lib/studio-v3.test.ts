import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compositionRecipes } from "../features/studio/StudioRecipeRail";
import {
  createCompositionProjectFile,
  createCompositionSnapshot,
  parseCompositionProjectFile,
} from "./composition-project-store";

describe("Studio 4 project system", () => {
  it("round-trips V4 non-destructive layer state through a portable NHB project", async () => {
    const project = createCompositionSnapshot({
      name: "layer-study",
      mode: "moodboard",
      title: "Layer study",
      caption: "Local project",
      paperColor: "#5b2438",
      artboardPreset: "story",
      images: [{
        id: "frame-1",
        name: "frame.webp",
        src: "blob:frame-1",
        blob: new Blob([new Uint8Array([3, 1, 4])], { type: "image/webp" }),
        visible: false,
        opacity: 0.55,
        blendMode: "soft-light",
        locked: true,
        groupId: "studio-primary-group",
        crop: { x: 0.08, y: 0.08, width: 0.84, height: 0.84 },
        adjustments: { brightness: 1.1, contrast: 0.92, saturation: 0.8, temperature: 0.4, blur: 1.2 },
        mask: "rounded",
      }],
    });
    const restored = await parseCompositionProjectFile(await createCompositionProjectFile(project));
    expect(restored.version).toBe(4);
    expect(restored.artboardPreset).toBe("story");
    expect(restored.images[0]).toMatchObject({
      visible: false,
      opacity: 0.55,
      blendMode: "soft-light",
      locked: true,
      groupId: "studio-primary-group",
      mask: "rounded",
      adjustments: { temperature: 0.4, blur: 1.2 },
    });
    expect(Array.from(new Uint8Array(await restored.images[0]!.blob!.arrayBuffer()))).toEqual([3, 1, 4]);
  });

  it("migrates V2 projects to explicit V4 artboard and layer defaults", async () => {
    const legacy = {
      id: "legacy-v2",
      version: 2,
      projectType: "composition",
      name: "Legacy",
      mode: "filmstrip",
      title: "Legacy",
      caption: "",
      paperColor: "#fffaf0",
      textAlign: "left",
      titleScale: 1,
      images: [{ id: "old", name: "old.webp", src: "/old.webp" }],
      createdAt: 1,
      savedAt: 2,
    };
    const restored = await parseCompositionProjectFile(new Blob([JSON.stringify(legacy)]));
    expect(restored.version).toBe(4);
    expect(restored.artboardPreset).toBe("auto");
    expect(restored.images[0]).toMatchObject({
      visible: true,
      opacity: 1,
      blendMode: "source-over",
      locked: false,
      mask: "none",
      crop: { x: 0, y: 0, width: 1, height: 1 },
      adjustments: { brightness: 1, contrast: 1, saturation: 1, temperature: 0, blur: 0 },
    });
  });

  it("migrates V3 projects without erasing existing layer settings", async () => {
    const legacy = {
      id: "legacy-v3",
      version: 3,
      projectType: "composition",
      name: "Legacy layers",
      mode: "moodboard",
      title: "Legacy",
      caption: "",
      paperColor: "#fffaf0",
      textAlign: "center",
      titleScale: 1.1,
      images: [{ id: "old", name: "old.webp", src: "/old.webp", opacity: 0.7, blendMode: "screen" }],
      createdAt: 1,
      savedAt: 2,
    };
    const restored = await parseCompositionProjectFile(new Blob([JSON.stringify(legacy)]));
    expect(restored).toMatchObject({ version: 4, artboardPreset: "auto", textAlign: "center", titleScale: 1.1 });
    expect(restored.images[0]).toMatchObject({ opacity: 0.7, blendMode: "screen", mask: "none" });
  });

  it("ships recipes, OPFS mirroring and worker-canvas export with a main-thread fallback", () => {
    expect(compositionRecipes).toHaveLength(4);
    expect(new Set(compositionRecipes.map((recipe) => recipe.id)).size).toBe(4);
    const opfs = readFileSync(resolve(process.cwd(), "src/lib/local-project-files.ts"), "utf8");
    const projectStore = readFileSync(resolve(process.cwd(), "src/lib/composition-project-store.ts"), "utf8");
    const exportSource = readFileSync(resolve(process.cwd(), "src/lib/studio-export.ts"), "utf8");
    const workerSource = readFileSync(resolve(process.cwd(), "src/workers/studio-export.worker.ts"), "utf8");
    expect(opfs).toContain("getDirectory");
    expect(opfs).toContain("nhb-studio");
    expect(projectStore).toContain("COMPOSITION_MIRROR_INTERVAL_MS = 5_000");
    expect(projectStore).toContain("if (mirrored) lastMirrorWrite.set(project.id, now)");
    expect(exportSource).toContain("canvas.toBlob");
    expect(exportSource).toContain("new Worker");
    expect(workerSource).toContain("OffscreenCanvas");
    expect(workerSource).toContain("convertToBlob");
  });
});
