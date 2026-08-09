import type { StoryLayout } from "../types/visual-story";
import type { SceneMotion } from "../types/scene-graph";
import { runLocalStudioRequest } from "./local-studio-db";
import { normalizeSceneMotion } from "./scene-graph";

export type StoryProjectFrame = {
  id: string;
  projectId: string;
  src: string;
  alt: string;
};

export type StoryProjectChapter = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  layout: StoryLayout;
  media: StoryProjectFrame[];
  scene: SceneMotion;
};

export type StoryProject = {
  id: string;
  version: 2;
  projectType: "story";
  name: string;
  title: string;
  subtitle: string;
  accent: string;
  chapters: StoryProjectChapter[];
  createdAt: number;
  savedAt: number;
};

type LegacyStoryProject = Omit<StoryProject, "version" | "chapters"> & {
  version: 1;
  chapters: Array<Omit<StoryProjectChapter, "scene">>;
};

function migrateStoryProject(project: StoryProject | LegacyStoryProject): StoryProject {
  return {
    ...project,
    version: 2,
    chapters: project.chapters.map((chapter, index) => ({
      ...chapter,
      scene: normalizeSceneMotion("scene" in chapter ? chapter.scene : {
        transition: index % 3 === 0 ? "veil" : index % 3 === 1 ? "drift" : "focus",
        intensity: 0.58 + (index % 3) * 0.1,
      }),
    })),
  };
}

export function createStoryProjectId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `story-${crypto.randomUUID()}`
    : `story-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createStoryChapter(index: number, media: StoryProjectFrame[] = []): StoryProjectChapter {
  return {
    id: `chapter-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    kicker: `${String(index + 1).padStart(2, "0")} / NOTE`,
    title: index === 0 ? "从一束光开始" : `章节 ${index + 1}`,
    body: "记录材料、天气与光线之间正在发生的关系。",
    layout: index % 2 === 0 ? "full" : "columns",
    media,
    scene: normalizeSceneMotion({
      transition: index % 3 === 0 ? "veil" : index % 3 === 1 ? "drift" : "focus",
      durationMs: 850 + (index % 4) * 120,
      intensity: 0.58 + (index % 3) * 0.1,
      depth: 0.4 + (index % 4) * 0.12,
    }),
  };
}

export function createStoryProject(input: Partial<Pick<StoryProject, "name" | "title" | "subtitle" | "accent" | "chapters">> = {}): StoryProject {
  const now = Date.now();
  return {
    id: createStoryProjectId(),
    version: 2,
    projectType: "story",
    name: input.name ?? "Untitled visual story",
    title: input.title ?? "A Story of Light",
    subtitle: input.subtitle ?? "一段可以重新排序的视觉札记",
    accent: input.accent ?? "#56705d",
    chapters: input.chapters ?? [createStoryChapter(0)],
    createdAt: now,
    savedAt: now,
  };
}

export async function saveStoryProject(project: StoryProject) {
  if (!("indexedDB" in window)) return;
  await runLocalStudioRequest("stories", "readwrite", (store) => store.put(project));
}

export async function listStoryProjects() {
  if (!("indexedDB" in window)) return [];
  const projects = await runLocalStudioRequest<Array<StoryProject | LegacyStoryProject>>("stories", "readonly", (store) => store.getAll());
  return projects.map(migrateStoryProject).sort((left, right) => right.savedAt - left.savedAt);
}

export async function getStoryProject(id: string) {
  if (!("indexedDB" in window)) return null;
  const project = await runLocalStudioRequest<StoryProject | LegacyStoryProject | undefined>("stories", "readonly", (store) => store.get(id));
  return project ? migrateStoryProject(project) : null;
}

export async function deleteStoryProject(id: string) {
  if (!("indexedDB" in window)) return;
  await runLocalStudioRequest("stories", "readwrite", (store) => store.delete(id));
}

export function createStoryProjectFile(project: StoryProject) {
  return new Blob([JSON.stringify(project)], { type: "application/x-nhb-story+json" });
}

export async function parseStoryProjectFile(file: Blob): Promise<StoryProject> {
  const project = JSON.parse(await file.text()) as StoryProject | LegacyStoryProject;
  if (
    ![1, 2].includes(project.version)
    || project.projectType !== "story"
    || !project.id
    || !project.title
    || !Array.isArray(project.chapters)
    || project.chapters.some((chapter) => !chapter.id || !Array.isArray(chapter.media))
  ) {
    throw new Error("Invalid NHB story project");
  }
  return migrateStoryProject(project);
}
