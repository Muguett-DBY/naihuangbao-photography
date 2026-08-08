import type { CompositionImage, CompositionTextAlign } from "../types/composition";
import type { CompositionMode } from "./composition-layout";
import { runLocalStudioRequest } from "./local-studio-db";

export const COMPOSITION_AUTOSAVE_ID = "composition-autosave";
const MAX_VERSIONS_PER_PROJECT = 8;

export type StoredCompositionImage = Pick<CompositionImage, "id" | "name" | "src" | "transform"> & {
  blob?: Blob;
};

export type CompositionProjectSnapshot = {
  id: string;
  version: 2;
  projectType: "composition";
  name: string;
  mode: CompositionMode;
  title: string;
  caption: string;
  paperColor: string;
  textAlign: CompositionTextAlign;
  titleScale: number;
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
};

type LegacyCompositionProject = Omit<CompositionProjectSnapshot, "version" | "textAlign" | "titleScale" | "createdAt"> & {
  version: 1;
};

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
  return {
    ...project,
    id: project.id || COMPOSITION_AUTOSAVE_ID,
    version: 2,
    textAlign: "left",
    titleScale: 1,
    createdAt: now,
    ...(project.version === 2 ? {
      textAlign: project.textAlign,
      titleScale: project.titleScale,
      createdAt: project.createdAt,
    } : {}),
  };
}

export function createCompositionProjectId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `composition-${crypto.randomUUID()}`
    : `composition-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveCompositionProject(project: CompositionProjectSnapshot) {
  if (!("indexedDB" in window)) return;
  await runLocalStudioRequest("compositions", "readwrite", (store) => store.put(project));
}

export async function getCompositionProject(id = COMPOSITION_AUTOSAVE_ID) {
  if (!("indexedDB" in window)) return null;
  const project = await runLocalStudioRequest<CompositionProjectSnapshot | LegacyCompositionProject | undefined>(
    "compositions",
    "readonly",
    (store) => store.get(id),
  );
  return project ? migrateProject(project) : null;
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
  if (!("indexedDB" in window)) return;
  await runLocalStudioRequest("compositions", "readwrite", (store) => store.delete(id));
}

export async function createCompositionProjectFile(project: CompositionProjectSnapshot) {
  const images = await Promise.all(project.images.map(async (image): Promise<PortableImage> => ({
    id: image.id,
    name: image.name,
    src: image.blob ? "" : image.src,
    transform: image.transform,
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
    ![1, 2].includes(portable.version)
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
      blob: image.blob && "data" in image.blob ? base64ToBlob(image.blob.data, image.blob.type) : undefined,
    })),
  };
}

export function createCompositionSnapshot(
  input: Omit<CompositionProjectSnapshot, "id" | "version" | "projectType" | "textAlign" | "titleScale" | "createdAt" | "savedAt">
    & Partial<Pick<CompositionProjectSnapshot, "id" | "textAlign" | "titleScale" | "createdAt">>,
) {
  const now = Date.now();
  return {
    ...input,
    id: input.id ?? COMPOSITION_AUTOSAVE_ID,
    textAlign: input.textAlign ?? "left",
    titleScale: input.titleScale ?? 1,
    createdAt: input.createdAt ?? now,
    version: 2,
    projectType: "composition",
    savedAt: now,
  } satisfies CompositionProjectSnapshot;
}

export async function createCompositionVersion(project: CompositionProjectSnapshot, label: string) {
  if (!("indexedDB" in window)) return null;
  const createdAt = Date.now();
  const version: CompositionVersionSnapshot = {
    id: `${project.id}:${createdAt}`,
    projectId: project.id,
    label: label.trim() || `Version ${new Date(createdAt).toLocaleString()}`,
    createdAt,
    snapshot: { ...project, savedAt: createdAt },
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
  return versions.filter((entry) => entry.projectId === projectId).sort((left, right) => right.createdAt - left.createdAt);
}
