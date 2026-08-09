import {
  DEFAULT_COMPOSITION_ADJUSTMENTS,
  DEFAULT_COMPOSITION_CROP,
  type CompositionArtboardPreset,
  type CompositionImage,
  type CompositionTextAlign,
} from "../types/composition";
import type { CompositionMode } from "./composition-layout";
import { runLocalStudioRequest } from "./local-studio-db";
import { deleteLocalProjectFile, getLocalProjectStorageStatus, readLocalProjectFile, writeLocalProjectFile } from "./local-project-files";

export const COMPOSITION_AUTOSAVE_ID = "composition-autosave";
const MAX_VERSIONS_PER_PROJECT = 8;
const COMPOSITION_MIRROR_INTERVAL_MS = 5_000;
const lastMirrorWrite = new Map<string, number>();

export type StoredCompositionImage = Pick<CompositionImage, "id" | "name" | "src" | "transform" | "visible" | "opacity" | "blendMode" | "locked" | "groupId" | "crop" | "adjustments" | "mask"> & {
  blob?: Blob;
};

export type CompositionProjectSnapshot = {
  id: string;
  version: 4;
  projectType: "composition";
  name: string;
  mode: CompositionMode;
  title: string;
  caption: string;
  paperColor: string;
  textAlign: CompositionTextAlign;
  titleScale: number;
  artboardPreset: CompositionArtboardPreset;
  images: StoredCompositionImage[];
  createdAt: number;
  savedAt: number;
};

export type CompositionVersionSnapshot = {
  id: string;
  projectId: string;
  label: string;
  createdAt: number;
  snapshot: CompositionProjectSnapshot;
  parentVersionId?: string;
  branch: string;
};

type LegacyV1CompositionProject = Omit<CompositionProjectSnapshot, "version" | "textAlign" | "titleScale" | "artboardPreset" | "createdAt"> & { version: 1 };
type LegacyV2CompositionProject = Omit<CompositionProjectSnapshot, "version" | "artboardPreset"> & { version: 2 };
type LegacyV3CompositionProject = Omit<CompositionProjectSnapshot, "version" | "artboardPreset"> & { version: 3 };
type LegacyCompositionProject = LegacyV1CompositionProject | LegacyV2CompositionProject | LegacyV3CompositionProject;

type PortableImage = Omit<StoredCompositionImage, "blob"> & {
  blob?: { type: string; data: string };
};

type PortableCompositionProject = Omit<CompositionProjectSnapshot, "images"> & {
  images: PortableImage[];
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 32_768;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64ToBlob(data: string, type: string) {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

function migrateProject(project: CompositionProjectSnapshot | LegacyCompositionProject): CompositionProjectSnapshot {
  const now = project.savedAt || Date.now();
  const textAlign = project.version === 1 ? "left" : project.textAlign;
  const titleScale = project.version === 1 ? 1 : project.titleScale;
  const createdAt = project.version === 1 ? now : project.createdAt;
  return {
    ...project,
    id: project.id || COMPOSITION_AUTOSAVE_ID,
    version: 4,
    textAlign,
    titleScale,
    createdAt,
    artboardPreset: project.version === 4 ? project.artboardPreset : "auto",
    images: project.images.map((image) => ({
      ...image,
      visible: image.visible ?? true,
      opacity: image.opacity ?? 1,
      blendMode: image.blendMode ?? "source-over",
      locked: image.locked ?? false,
      crop: { ...DEFAULT_COMPOSITION_CROP, ...image.crop },
      adjustments: { ...DEFAULT_COMPOSITION_ADJUSTMENTS, ...image.adjustments },
      mask: image.mask ?? "none",
    })),
  };
}

export function createCompositionProjectId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `composition-${crypto.randomUUID()}`
    : `composition-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveCompositionProject(project: CompositionProjectSnapshot) {
  if ("indexedDB" in window) {
    await runLocalStudioRequest("compositions", "readwrite", (store) => store.put(project));
  }
  const now = Date.now();
  if (now - (lastMirrorWrite.get(project.id) ?? 0) < COMPOSITION_MIRROR_INTERVAL_MS) return;
  const mirrored = await writeLocalProjectFile("compositions", `${project.id}.nhb`, await createCompositionProjectFile(project));
  if (mirrored) lastMirrorWrite.set(project.id, now);
}

export async function getCompositionProject(id = COMPOSITION_AUTOSAVE_ID) {
  if ("indexedDB" in window) {
    const project = await runLocalStudioRequest<CompositionProjectSnapshot | LegacyCompositionProject | undefined>(
      "compositions",
      "readonly",
      (store) => store.get(id),
    );
    if (project) return migrateProject(project);
  }
  const mirror = await readLocalProjectFile("compositions", `${id}.nhb`);
  return mirror ? parseCompositionProjectFile(mirror) : null;
}

export async function listCompositionProjects() {
  if (!("indexedDB" in window)) return [];
  const projects = await runLocalStudioRequest<Array<CompositionProjectSnapshot | LegacyCompositionProject>>(
    "compositions",
    "readonly",
    (store) => store.getAll(),
  );
  return projects.map(migrateProject).sort((left, right) => right.savedAt - left.savedAt);
}

export async function deleteCompositionProject(id: string) {
  if ("indexedDB" in window) await runLocalStudioRequest("compositions", "readwrite", (store) => store.delete(id));
  lastMirrorWrite.delete(id);
  await deleteLocalProjectFile("compositions", `${id}.nhb`);
}

export async function createCompositionProjectFile(project: CompositionProjectSnapshot) {
  const images = await Promise.all(project.images.map(async (image): Promise<PortableImage> => ({
    id: image.id,
    name: image.name,
    src: image.blob ? "" : image.src,
    transform: image.transform,
    visible: image.visible,
    opacity: image.opacity,
    blendMode: image.blendMode,
    locked: image.locked,
    groupId: image.groupId,
    crop: image.crop,
    adjustments: image.adjustments,
    mask: image.mask,
    blob: image.blob ? {
      type: image.blob.type || "image/jpeg",
      data: bytesToBase64(new Uint8Array(await image.blob.arrayBuffer())),
    } : undefined,
  })));
  const portable: PortableCompositionProject = { ...project, images };
  return new Blob([JSON.stringify(portable)], { type: "application/x-nhb-project+json" });
}

export async function parseCompositionProjectFile(file: Blob): Promise<CompositionProjectSnapshot> {
  const portable = JSON.parse(await file.text()) as PortableCompositionProject | LegacyCompositionProject;
  if (
    ![1, 2, 3, 4].includes(portable.version)
    || portable.projectType !== "composition"
    || !portable.id
    || !Array.isArray(portable.images)
  ) {
    throw new Error("Invalid NHB composition project");
  }
  const restored = migrateProject(portable as CompositionProjectSnapshot | LegacyCompositionProject);
  return {
    ...restored,
    images: portable.images.map((image) => ({
      id: image.id,
      name: image.name,
      src: image.src,
      transform: image.transform,
      visible: image.visible ?? true,
      opacity: image.opacity ?? 1,
      blendMode: image.blendMode ?? "source-over",
      locked: image.locked ?? false,
      groupId: image.groupId,
      crop: { ...DEFAULT_COMPOSITION_CROP, ...image.crop },
      adjustments: { ...DEFAULT_COMPOSITION_ADJUSTMENTS, ...image.adjustments },
      mask: image.mask ?? "none",
      blob: image.blob && "data" in image.blob ? base64ToBlob(image.blob.data, image.blob.type) : undefined,
    })),
  };
}

export function createCompositionSnapshot(
  input: Omit<CompositionProjectSnapshot, "id" | "version" | "projectType" | "textAlign" | "titleScale" | "artboardPreset" | "createdAt" | "savedAt">
    & Partial<Pick<CompositionProjectSnapshot, "id" | "textAlign" | "titleScale" | "artboardPreset" | "createdAt">>,
) {
  const now = Date.now();
  return {
    ...input,
    id: input.id ?? COMPOSITION_AUTOSAVE_ID,
    textAlign: input.textAlign ?? "left",
    titleScale: input.titleScale ?? 1,
    artboardPreset: input.artboardPreset ?? "auto",
    createdAt: input.createdAt ?? now,
    version: 4,
    projectType: "composition",
    savedAt: now,
  } satisfies CompositionProjectSnapshot;
}

export async function createCompositionVersion(project: CompositionProjectSnapshot, label: string, parentVersionId?: string, branch = "main") {
  if (!("indexedDB" in window)) return null;
  const createdAt = Date.now();
  const version: CompositionVersionSnapshot = {
    id: `${project.id}:${createdAt}`,
    projectId: project.id,
    label: label.trim() || `Version ${new Date(createdAt).toLocaleString()}`,
    createdAt,
    snapshot: { ...project, savedAt: createdAt },
    parentVersionId,
    branch,
  };
  await runLocalStudioRequest("compositionVersions", "readwrite", (store) => store.put(version));
  const versions = await listCompositionVersions(project.id);
  await Promise.all(versions.slice(MAX_VERSIONS_PER_PROJECT).map((entry) => (
    runLocalStudioRequest("compositionVersions", "readwrite", (store) => store.delete(entry.id))
  )));
  return version;
}

export async function listCompositionVersions(projectId: string) {
  if (!("indexedDB" in window)) return [];
  const versions = await runLocalStudioRequest<CompositionVersionSnapshot[]>(
    "compositionVersions",
    "readonly",
    (store) => store.getAll(),
  );
  return versions
    .filter((entry) => entry.projectId === projectId)
    .map((entry) => ({ ...entry, branch: entry.branch ?? "main" }))
    .sort((left, right) => right.createdAt - left.createdAt);
}

export { getLocalProjectStorageStatus };
