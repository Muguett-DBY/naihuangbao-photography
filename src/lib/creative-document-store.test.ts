import { describe, expect, it } from "vitest";
import { createCreativeDocument, duplicateCreativeScene, interpolateLayerValue, moveCreativeScene, upsertCreativeKeyframe } from "./creative-document-store";
import type { WorkspaceProject } from "../types/workspace-project";

const project: WorkspaceProject = {
  id: "creative-test", version: 2, projectType: "workspace", name: "Light study", description: "", accent: "#d36d61",
  assets: [{ assetId: "one", src: "/images/one.webp", alt: "One", title: "One", source: "archive", addedAt: 1 }],
  vaultAssetIds: [], creativeDocumentIds: [], compositionIds: [], storyIds: [], activeSurface: "composer", status: "active",
  exhibition: { theme: "paper", density: "editorial", motion: "calm", showIndex: true }, createdAt: 1, updatedAt: 1, lastOpenedAt: 1,
};

describe("creative document model", () => {
  it("creates and duplicates scenes without sharing identifiers", () => {
    const document = createCreativeDocument(project);
    const copy = duplicateCreativeScene(document.scenes[0]);
    expect(document.scenes).toHaveLength(1);
    expect(copy.id).not.toBe(document.scenes[0].id);
    expect(copy.layers[0].id).not.toBe(document.scenes[0].layers[0].id);
    expect(copy.name).toContain("copy");
  });

  it("moves scenes and interpolates authored keyframes", () => {
    const document = createCreativeDocument(project);
    const first = document.scenes[0];
    const second = duplicateCreativeScene(first);
    expect(moveCreativeScene([first, second], second.id, -1).map(({ id }) => id)).toEqual([second.id, first.id]);
    let layer = { ...first.layers[0], x: 0 };
    layer = upsertCreativeKeyframe(layer, "x", 0);
    layer = { ...layer, x: 100 };
    layer = upsertCreativeKeyframe(layer, "x", 1);
    expect(interpolateLayerValue(layer, "x", 0.5)).toBe(50);
  });
});
