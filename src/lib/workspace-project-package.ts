import type { WorkspaceProject, WorkspaceProjectPackage } from "../types/workspace-project";
import { createCompositionProjectFile, getCompositionProject, parseCompositionProjectFile, saveCompositionProject } from "./composition-project-store";
import { getCreativeDocument, saveCreativeDocument } from "./creative-document-store";
import { getStoryProject, saveStoryProject, type StoryProject } from "./story-project-store";
import { listVaultAssets } from "./vault-store";
import { isWorkspaceProject, migrateWorkspaceProject } from "./workspace-project-store";
import type { CreativeDocument } from "../types/creative-document";

export async function createWorkspaceProjectPackage(project: WorkspaceProject) {
  const compositions = typeof window === "undefined" ? [] : (await Promise.all(project.compositionIds.map((id) => getCompositionProject(id)))).filter(Boolean);
  const stories = typeof window === "undefined" ? [] : (await Promise.all(project.storyIds.map((id) => getStoryProject(id)))).filter((story): story is StoryProject => Boolean(story));
  const creativeDocuments = typeof window === "undefined" ? [] : (await Promise.all(project.creativeDocumentIds.map((id) => getCreativeDocument(id)))).filter((document): document is CreativeDocument => Boolean(document));
  const vaultAssets = typeof window === "undefined" ? [] : (await listVaultAssets()).filter((asset) => project.vaultAssetIds.includes(asset.id));
  const payload: WorkspaceProjectPackage = {
    format: "nhbpack",
    version: 3,
    exportedAt: Date.now(),
    project,
    compositionFiles: await Promise.all(compositions.map(async (composition) => ({ id: composition!.id, payload: await (await createCompositionProjectFile(composition!)).text() }))),
    stories,
    creativeDocuments,
    vaultManifest: vaultAssets.map(({ id, name, type, size }) => ({ id, name, type, size })),
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/x-nhb-workspace+json" });
}

export async function parseWorkspaceProjectPackage(file: Blob) {
  const payload = JSON.parse(await file.text()) as WorkspaceProjectPackage;
  if (payload.format !== "nhbpack" || ![1, 2, 3].includes(payload.version) || !isWorkspaceProject(payload.project)) {
    throw new Error("Invalid NHB workspace package");
  }
  if (payload.version === 2 || payload.version === 3) {
    if (!Array.isArray(payload.compositionFiles) || !Array.isArray(payload.stories)) throw new Error("Invalid NHB workspace package");
    for (const entry of payload.compositionFiles) {
      if (!entry || typeof entry.payload !== "string") throw new Error("Invalid NHB workspace package");
      await saveCompositionProject(await parseCompositionProjectFile(new Blob([entry.payload])));
    }
    for (const entry of payload.stories) {
      const story = entry as StoryProject;
      if (story?.projectType !== "story" || story.version !== 2) throw new Error("Invalid NHB workspace package");
      await saveStoryProject(story);
    }
  }
  if (payload.version === 3) {
    if (!Array.isArray(payload.creativeDocuments) || !Array.isArray(payload.vaultManifest)) throw new Error("Invalid NHB workspace package");
    for (const entry of payload.creativeDocuments) {
      const document = entry as CreativeDocument;
      if (document?.projectType !== "creative-document" || document.version !== 1 || !Array.isArray(document.scenes)) throw new Error("Invalid NHB workspace package");
      await saveCreativeDocument(document);
    }
  }
  return { ...migrateWorkspaceProject(payload.project), updatedAt: Date.now(), lastOpenedAt: Date.now() };
}
