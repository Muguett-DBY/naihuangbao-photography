import { describe, expect, it } from "vitest";
import type { WorkspaceAssetReference } from "../types/workspace-project";
import {
  MAX_WORKSPACE_ASSETS,
  addWorkspaceAsset,
  createWorkspaceProject,
  linkWorkspaceResource,
  removeWorkspaceAsset,
  updateWorkspaceProject,
} from "./workspace-project-store";
import { createWorkspaceProjectPackage, parseWorkspaceProjectPackage } from "./workspace-project-package";

function asset(index: number): WorkspaceAssetReference {
  return {
    assetId: `asset-${index}`,
    src: `/images/asset-${index}.webp`,
    alt: `Asset ${index}`,
    title: `Frame ${index}`,
    source: "archive",
    addedAt: index,
  };
}

describe("workspace project store", () => {
  it("creates a local-first project and deduplicates collected frames", () => {
    const project = createWorkspaceProject({ name: "Rain index" });
    const collected = addWorkspaceAsset(addWorkspaceAsset(project, asset(1)), asset(1));
    expect(collected.name).toBe("Rain index");
    expect(collected.assets).toHaveLength(1);
    expect(collected.coverAssetId).toBe("asset-1");
  });

  it("keeps the latest bounded collection and repairs the cover on removal", () => {
    const project = Array.from({ length: MAX_WORKSPACE_ASSETS + 3 }, (_, index) => index)
      .reduce((current, index) => addWorkspaceAsset(current, asset(index)), createWorkspaceProject());
    expect(project.assets).toHaveLength(MAX_WORKSPACE_ASSETS);
    expect(project.assets[0].assetId).toBe("asset-3");
    const removed = removeWorkspaceAsset({ ...project, coverAssetId: "asset-3" }, "asset-3");
    expect(removed.coverAssetId).toBe("asset-4");
  });

  it("links legacy composition and story resources without duplicates", () => {
    const project = createWorkspaceProject();
    const withComposition = linkWorkspaceResource(linkWorkspaceResource(project, "studio", "composition-1"), "studio", "composition-1");
    const withStory = linkWorkspaceResource(withComposition, "story", "story-1");
    expect(withStory.compositionIds).toEqual(["composition-1"]);
    expect(withStory.storyIds).toEqual(["story-1"]);
    expect(withStory.activeSurface).toBe("story");
  });

  it("round-trips a portable nhbpack", async () => {
    const project = updateWorkspaceProject(addWorkspaceAsset(createWorkspaceProject(), asset(1)), { description: "Portable study" });
    const file = await createWorkspaceProjectPackage(project);
    const payload = JSON.parse(await file.text());
    expect(payload).toMatchObject({ format: "nhbpack", version: 2, compositionFiles: [], stories: [] });
    const restored = await parseWorkspaceProjectPackage(file);
    expect(restored.id).toBe(project.id);
    expect(restored.assets[0].assetId).toBe("asset-1");
    expect(restored.description).toBe("Portable study");
  });

  it("rejects unrelated JSON packages", async () => {
    await expect(parseWorkspaceProjectPackage(new Blob([JSON.stringify({ version: 1 })]))).rejects.toThrow("Invalid NHB workspace package");
  });
});
