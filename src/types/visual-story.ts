import type { ArchiveMedia } from "./living-archive";
import type { SceneMotion } from "./scene-graph";

export type StoryLayout = "full" | "columns" | "contact" | "quiet" | "diptych" | "compare" | "annotation" | "interlude" | "constellation";

export type VisualStoryChapter = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  layout: StoryLayout;
  media: ArchiveMedia[];
  scene?: SceneMotion;
};

export type VisualStory = {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  publishedAt: string;
  readingMinutes: number;
  accent: string;
  concept: true;
  chapters: VisualStoryChapter[];
};

export type VisualStoryManifest = {
  schemaVersion: 1;
  generatedFrom: string;
  stories: VisualStory[];
};
