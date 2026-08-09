import type { WorkspaceProject, WorkspaceProjectPackage } from "../types/workspace-project";
import { createCompositionProjectFile, getCompositionProject, parseCompositionProjectFile, saveCompositionProject } from "./composition-project-store";
import { getStoryProject, saveStoryProject, type StoryProject } from "./story-project-store";
import { isWorkspaceProject } from "./workspace-project-store";

export async function createWorkspaceProjectPackage(project: WorkspaceProject) {
  const compositions = typeof window === "undefined" ? [] : (await Promise.all(project.compositionIds.map((id) => getCompositionProject(id)))).filter(Boolean);
  const stories = typeof window === "undefined" ? [] : (await Promise.all(project.storyIds.map((id) => getStoryProject(id)))).filter((story): story is StoryProject => Boolean(story));
  const payload: WorkspaceProjectPackage = {
    format: "nhbpack",
    version: 2,
    exportedAt: Date.now(),
    project,
    compositionFiles: await Promise.all(compositions.map(async (composition) => ({ id: composition!.id, payload: await (await createCompositionProjectFile(composition!)).text() }))),
    stories,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/x-nhb-workspace+json" });
}

export async function parseWorkspaceProjectPackage(file: Blob) {
  const payload = JSON.parse(await file.text()) as WorkspaceProjectPackage;
  if (payload.format !== "nhbpack" || ![1, 2].includes(payload.version) || !isWorkspaceProject(payload.project)) {
    throw new Error("Invalid NHB workspace package");
  }
  if (payload.version === 2) {
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
  return { ...payload.project, updatedAt: Date.now() };
}
