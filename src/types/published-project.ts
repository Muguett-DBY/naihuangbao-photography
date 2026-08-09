import type { LegacyWorkspaceProject, WorkspaceProject } from "./workspace-project";

export type PublishedProjectDraft = {
  schemaVersion: 1;
  project: WorkspaceProject | LegacyWorkspaceProject;
  contentHash: string;
};

export type PublishedProjectSnapshot = PublishedProjectDraft & {
  id: string;
  slug: string;
  version: number;
  publishedAt: string;
};

export type ResolvedPublishedProjectSnapshot = Omit<PublishedProjectSnapshot, "project"> & { project: WorkspaceProject };

export type PublishedProjectVersion = Pick<PublishedProjectSnapshot, "slug" | "version" | "publishedAt" | "contentHash">;

export type PublishedProjectReceipt = PublishedProjectVersion & {
  id: string;
  url: string;
};
