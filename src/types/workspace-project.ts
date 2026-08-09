export type WorkspaceSurface = "archive" | "vault" | "composer" | "studio" | "story" | "publish";

export type WorkspaceAssetSource = "archive" | "upload" | "composition";

export type WorkspaceAssetReference = {
  assetId: string;
  src: string;
  alt: string;
  title: string;
  source: WorkspaceAssetSource;
  addedAt: number;
};

export type WorkspaceProjectStatus = "active" | "paused" | "published";

export type WorkspaceExhibitionTheme = "paper" | "gallery" | "night";

export type WorkspaceExhibition = {
  theme: WorkspaceExhibitionTheme;
  density: "editorial" | "immersive";
  motion: "full" | "calm";
  showIndex: boolean;
};

export type LegacyWorkspaceProject = {
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
  activeSurface: Exclude<WorkspaceSurface, "vault" | "composer">;
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceProject = {
  id: string;
  version: 2;
  projectType: "workspace";
  name: string;
  description: string;
  accent: string;
  coverAssetId?: string;
  assets: WorkspaceAssetReference[];
  vaultAssetIds: string[];
  creativeDocumentIds: string[];
  compositionIds: string[];
  storyIds: string[];
  activeSurface: WorkspaceSurface;
  status: WorkspaceProjectStatus;
  exhibition: WorkspaceExhibition;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
};

export type WorkspaceEventType = "created" | "opened" | "asset-added" | "asset-removed" | "resource-linked" | "checkpoint" | "imported" | "synced" | "published";

export type WorkspaceProjectEvent = {
  id: string;
  projectId: string;
  type: WorkspaceEventType;
  surface: WorkspaceSurface;
  summary: string;
  createdAt: number;
};

export type WorkspaceProjectPackageV1 = {
  format: "nhbpack";
  version: 1;
  exportedAt: number;
  project: WorkspaceProject | LegacyWorkspaceProject;
};

export type WorkspaceProjectPackageV2 = {
  format: "nhbpack";
  version: 2;
  exportedAt: number;
  project: WorkspaceProject | LegacyWorkspaceProject;
  compositionFiles: Array<{ id: string; payload: string }>;
  stories: unknown[];
};

export type WorkspaceProjectPackageV3 = {
  format: "nhbpack";
  version: 3;
  exportedAt: number;
  project: WorkspaceProject;
  compositionFiles: Array<{ id: string; payload: string }>;
  stories: unknown[];
  creativeDocuments: unknown[];
  vaultManifest: Array<{ id: string; name: string; type: string; size: number }>;
};

export type WorkspaceProjectPackage = WorkspaceProjectPackageV1 | WorkspaceProjectPackageV2 | WorkspaceProjectPackageV3;
