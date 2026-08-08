import type { BeautyCategory, BeautySettings, BeautyTool, FrameId, StickerOverlay, TextOverlay } from "../types/photo-editor";
import { runLocalStudioRequest } from "./local-studio-db";

const AUTOSAVE_ID = "autosave";

export type EditorProjectSnapshot = {
  id: typeof AUTOSAVE_ID;
  version: 1;
  name: string;
  fileName: string;
  source: Blob;
  settings: BeautySettings;
  activeCategory?: BeautyCategory;
  activeTool?: BeautyTool;
  activeWorkflow?: "quick" | "color" | "compose" | "export";
  skipFaceDetection?: boolean;
  history: BeautySettings[];
  historyIndex: number;
  frameId: FrameId;
  texts: TextOverlay[];
  stickers: StickerOverlay[];
  savedAt: number;
};

type PortableEditorProject = Omit<EditorProjectSnapshot, "source"> & {
  source: { type: string; data: string };
};

export async function saveEditorProject(project: EditorProjectSnapshot) {
  if (!("indexedDB" in window)) return;
  await runLocalStudioRequest("projects", "readwrite", (store) => store.put(project));
}

export async function getEditorProject() {
  if (!("indexedDB" in window)) return null;
  return (await runLocalStudioRequest<EditorProjectSnapshot | undefined>("projects", "readonly", (store) => store.get(AUTOSAVE_ID))) ?? null;
}

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

export async function createEditorProjectFile(project: EditorProjectSnapshot) {
  const source = {
    type: project.source.type || "image/jpeg",
    data: bytesToBase64(new Uint8Array(await project.source.arrayBuffer())),
  };
  const portable: PortableEditorProject = { ...project, source };
  return new Blob([JSON.stringify(portable)], { type: "application/x-nhb-project+json" });
}

export async function parseEditorProjectFile(file: Blob): Promise<EditorProjectSnapshot> {
  const portable = JSON.parse(await file.text()) as PortableEditorProject;
  if (portable.version !== 1 || portable.id !== AUTOSAVE_ID || !portable.source?.data || !portable.settings) {
    throw new Error("Invalid NHB project file");
  }
  return {
    ...portable,
    source: base64ToBlob(portable.source.data, portable.source.type),
  };
}
