import type { CompositionImage } from "../types/composition";
import type { CompositionMode } from "./composition-layout";
import { runLocalStudioRequest } from "./local-studio-db";

const COMPOSITION_AUTOSAVE_ID = "composition-autosave";

export type StoredCompositionImage = Pick<CompositionImage, "id" | "name" | "src"> & {
  blob?: Blob;
};

export type CompositionProjectSnapshot = {
  id: typeof COMPOSITION_AUTOSAVE_ID;
  version: 1;
  projectType: "composition";
  name: string;
  mode: CompositionMode;
  title: string;
  caption: string;
  paperColor: string;
  images: StoredCompositionImage[];
  savedAt: number;
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

export async function saveCompositionProject(project: CompositionProjectSnapshot) {
  if (!("indexedDB" in window)) return;
  await runLocalStudioRequest("compositions", "readwrite", (store) => store.put(project));
}

export async function getCompositionProject() {
  if (!("indexedDB" in window)) return null;
  return (await runLocalStudioRequest<CompositionProjectSnapshot | undefined>(
    "compositions",
    "readonly",
    (store) => store.get(COMPOSITION_AUTOSAVE_ID),
  )) ?? null;
}

export async function createCompositionProjectFile(project: CompositionProjectSnapshot) {
  const images = await Promise.all(project.images.map(async (image): Promise<PortableImage> => ({
    id: image.id,
    name: image.name,
    src: image.blob ? "" : image.src,
    blob: image.blob ? {
      type: image.blob.type || "image/jpeg",
      data: bytesToBase64(new Uint8Array(await image.blob.arrayBuffer())),
    } : undefined,
  })));
  const portable: PortableCompositionProject = { ...project, images };
  return new Blob([JSON.stringify(portable)], { type: "application/x-nhb-project+json" });
}

export async function parseCompositionProjectFile(file: Blob): Promise<CompositionProjectSnapshot> {
  const portable = JSON.parse(await file.text()) as PortableCompositionProject;
  if (
    portable.version !== 1
    || portable.projectType !== "composition"
    || portable.id !== COMPOSITION_AUTOSAVE_ID
    || !Array.isArray(portable.images)
  ) {
    throw new Error("Invalid NHB composition project");
  }
  return {
    ...portable,
    images: portable.images.map((image) => ({
      id: image.id,
      name: image.name,
      src: image.src,
      blob: image.blob ? base64ToBlob(image.blob.data, image.blob.type) : undefined,
    })),
  };
}

export function createCompositionSnapshot(input: Omit<CompositionProjectSnapshot, "id" | "version" | "projectType" | "savedAt">) {
  return {
    ...input,
    id: COMPOSITION_AUTOSAVE_ID,
    version: 1,
    projectType: "composition",
    savedAt: Date.now(),
  } satisfies CompositionProjectSnapshot;
}
