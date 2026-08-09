import type { WorkspaceProject } from "./workspace-project";

export type ProjectSyncReceipt = {
  projectId: string;
  revision: number;
  contentHash: string;
  updatedAt: string;
  uploadedAssets: number;
  skippedAssets: number;
};

export type ProjectSyncVersion = Omit<ProjectSyncReceipt, "uploadedAssets" | "skippedAssets">;

export type ProjectSyncSnapshot = {
  project: WorkspaceProject;
  revision: number;
  contentHash: string;
  updatedAt: string;
};

export type ProjectSyncQueueItem = {
  id: string;
  project: WorkspaceProject;
  expectedRevision: number;
  createdAt: number;
  attempts: number;
};
