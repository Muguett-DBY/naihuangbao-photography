import { describe, expect, it } from "vitest";
import type { WorkspaceProject } from "../types/workspace-project";
import { hashSyncProject, isSyncWorkspaceProject } from "./project-sync-contract";

const project: WorkspaceProject = {
  id: "sync-test", version: 2, projectType: "workspace", name: "Sync study", description: "Local-first", accent: "#446f5a",
  assets: [], vaultAssetIds: [], creativeDocumentIds: [], compositionIds: [], storyIds: [], activeSurface: "vault", status: "active",
  exhibition: { theme: "gallery", density: "immersive", motion: "full", showIndex: false }, createdAt: 1, updatedAt: 2, lastOpenedAt: 2,
};

describe("project sync contract", () => {
  it("accepts complete V2 projects and produces stable SHA-256 hashes", async () => {
    expect(isSyncWorkspaceProject(project)).toBe(true);
    const first = await hashSyncProject(project);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashSyncProject(project)).toBe(first);
  });

  it("rejects legacy, oversized, and malformed project payloads", () => {
    expect(isSyncWorkspaceProject({ ...project, version: 1 })).toBe(false);
    expect(isSyncWorkspaceProject({ ...project, name: "" })).toBe(false);
    expect(isSyncWorkspaceProject({ ...project, assets: Array.from({ length: 65 }, (_, index) => ({ assetId: String(index), src: "/x", title: "x" })) })).toBe(false);
    expect(isSyncWorkspaceProject({ ...project, activeSurface: "unknown" })).toBe(false);
    expect(isSyncWorkspaceProject({ ...project, assets: [{ assetId: "broken", src: "/x", title: "Missing fields" }] })).toBe(false);
  });
});
