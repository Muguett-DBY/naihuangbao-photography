import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compositionRecipes } from "../features/studio/StudioRecipeRail";
import {
  createCompositionProjectFile,
  createCompositionSnapshot,
  parseCompositionProjectFile,
} from "./composition-project-store";

describe("Studio 3.0 project system", () => {
  it("round-trips V3 layer state through a portable NHB project", async () => {
    const project = createCompositionSnapshot({
      name: "layer-study",
      mode: "moodboard",
      title: "Layer study",
      caption: "Local project",
      paperColor: "#5b2438",
      images: [{
        id: "frame-1",
        name: "frame.webp",
        src: "blob:frame-1",
        blob: new Blob([new Uint8Array([3, 1, 4])], { type: "image/webp" }),
        visible: false,
        opacity: 0.55,
        blendMode: "soft-light",
      }],
    });
    const restored = await parseCompositionProjectFile(await createCompositionProjectFile(project));
    expect(restored.version).toBe(3);
    expect(restored.images[0]).toMatchObject({ visible: false, opacity: 0.55, blendMode: "soft-light" });
    expect(Array.from(new Uint8Array(await restored.images[0]!.blob!.arrayBuffer()))).toEqual([3, 1, 4]);
  });

  it("migrates V2 projects to explicit default layer state", async () => {
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
    expect(restored.version).toBe(3);
    expect(restored.images[0]).toMatchObject({ visible: true, opacity: 1, blendMode: "source-over" });
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
