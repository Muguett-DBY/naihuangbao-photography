export type WorkspaceSurface = "archive" | "studio" | "story" | "publish";

export type WorkspaceAssetSource = "archive" | "upload" | "composition";

export type WorkspaceAssetReference = {
  assetId: string;
  src: string;
  alt: string;
  title: string;
  source: WorkspaceAssetSource;
  addedAt: number;
};

export type WorkspaceProject = {
  id: string;
  version: 1;
  projectType: "workspace";
  name: string;
  description: string;
  accent: string;
  coverAssetId?: string;
  assets: WorkspaceAssetReference[];
  compositionIds: string[];
  storyIds: string[];
  activeSurface: WorkspaceSurface;
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceProjectPackageV1 = {
  format: "nhbpack";
  version: 1;
  exportedAt: number;
  project: WorkspaceProject;
};

export type WorkspaceProjectPackageV2 = {
  format: "nhbpack";
  version: 2;
  exportedAt: number;
  project: WorkspaceProject;
  compositionFiles: Array<{ id: string; payload: string }>;
  stories: unknown[];
};

export type WorkspaceProjectPackage = WorkspaceProjectPackageV1 | WorkspaceProjectPackageV2;
