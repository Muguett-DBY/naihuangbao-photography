import type { StoryLayout } from "../types/visual-story";
import { runLocalStudioRequest } from "./local-studio-db";

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
};

export type StoryProject = {
  id: string;
  version: 1;
  projectType: "story";
  name: string;
  title: string;
  subtitle: string;
  accent: string;
  chapters: StoryProjectChapter[];
  createdAt: number;
  savedAt: number;
};

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
  };
}

export function createStoryProject(input: Partial<Pick<StoryProject, "name" | "title" | "subtitle" | "accent" | "chapters">> = {}): StoryProject {
  const now = Date.now();
  return {
    id: createStoryProjectId(),
    version: 1,
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
  const projects = await runLocalStudioRequest<StoryProject[]>("stories", "readonly", (store) => store.getAll());
  return projects.sort((left, right) => right.savedAt - left.savedAt);
}

export async function getStoryProject(id: string) {
  if (!("indexedDB" in window)) return null;
  return (await runLocalStudioRequest<StoryProject | undefined>("stories", "readonly", (store) => store.get(id))) ?? null;
}

export async function deleteStoryProject(id: string) {
  if (!("indexedDB" in window)) return;
  await runLocalStudioRequest("stories", "readwrite", (store) => store.delete(id));
}

export function createStoryProjectFile(project: StoryProject) {
  return new Blob([JSON.stringify(project)], { type: "application/x-nhb-story+json" });
}

export async function parseStoryProjectFile(file: Blob): Promise<StoryProject> {
  const project = JSON.parse(await file.text()) as StoryProject;
  if (
    project.version !== 1
    || project.projectType !== "story"
    || !project.id
    || !project.title
    || !Array.isArray(project.chapters)
    || project.chapters.some((chapter) => !chapter.id || !Array.isArray(chapter.media))
  ) {
    throw new Error("Invalid NHB story project");
  }
  return project;
}
