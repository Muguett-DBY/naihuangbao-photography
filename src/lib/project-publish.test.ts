import { describe, expect, it } from "vitest";
import type { WorkspaceProject } from "../types/workspace-project";
import { createPublishedProjectDraft } from "./project-publish";
import { validatePublishedProjectDraft } from "./project-publish-contract";

function project(): WorkspaceProject {
  return {
    id: "workspace-test",
    version: 2,
    projectType: "workspace",
    name: "  Rain Glass Study  ",
    description: "A personal practice project.",
    accent: "#d25f62",
    assets: [
      { assetId: "public", src: "/images/visual-os-v7/05-rain-observatory.webp", alt: "Rain observatory", title: "Rain observatory", source: "archive", addedAt: 1 },
      { assetId: "local", src: "blob:local-only", alt: "Local", title: "Local", source: "upload", addedAt: 2 },
    ],
    vaultAssetIds: [],
    creativeDocumentIds: [],
    compositionIds: ["composition-1"],
    storyIds: ["story-1"],
    activeSurface: "publish",
    status: "active",
    exhibition: { theme: "paper", density: "editorial", motion: "calm", showIndex: true },
    createdAt: 1,
    updatedAt: 2,
    lastOpenedAt: 2,
  };
}

describe("published project contract", () => {
  it("creates deterministic portable drafts and excludes browser-only assets", async () => {
    const first = await createPublishedProjectDraft(project());
    const second = await createPublishedProjectDraft(project());
    expect(first.project.name).toBe("Rain Glass Study");
    expect(first.project.assets.map((asset) => asset.assetId)).toEqual(["public"]);
    expect(first.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(second.contentHash).toBe(first.contentHash);
    expect(validatePublishedProjectDraft(first)).toBe(true);
  });

  it("rejects malformed hashes and non-public asset protocols", async () => {
    const draft = await createPublishedProjectDraft(project());
    expect(validatePublishedProjectDraft({ ...draft, contentHash: "short" })).toBe(false);
    expect(validatePublishedProjectDraft({ ...draft, project: { ...draft.project, assets: [{ ...draft.project.assets[0], src: "javascript:alert(1)" }] } })).toBe(false);
  });
});
