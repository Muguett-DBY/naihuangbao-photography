import type { CreativeDocument, CreativeKeyframe, CreativeKeyframeProperty, CreativeLayer, CreativeScene } from "../types/creative-document";
import type { WorkspaceAssetReference, WorkspaceProject } from "../types/workspace-project";
import { runLocalStudioRequest } from "./local-studio-db";

function id(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCreativeLayer(asset: WorkspaceAssetReference | null, index = 0): CreativeLayer {
  return {
    id: id("layer"),
    name: asset?.title || `Layer ${index + 1}`,
    asset,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    blendMode: "normal",
    locked: false,
    keyframes: [],
  };
}

export function createCreativeScene(asset: WorkspaceAssetReference | null = null, index = 0): CreativeScene {
  return {
    id: id("scene"),
    name: asset?.title || `Scene ${index + 1}`,
    durationMs: 2800,
    transition: index === 0 ? "cut" : "fade",
    background: index % 2 === 0 ? "#e9e1d3" : "#18372d",
    layers: [createCreativeLayer(asset)],
  };
}

export function createCreativeDocument(project: Pick<WorkspaceProject, "id" | "name" | "assets">): CreativeDocument {
  const now = Date.now();
  const selected = project.assets.slice(0, 5);
  return {
    id: id("composition"),
    version: 1,
    projectType: "creative-document",
    projectId: project.id,
    name: `${project.name} / Scene study`,
    aspect: "landscape",
    scenes: selected.length ? selected.map(createCreativeScene) : [createCreativeScene()],
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateCreativeScene(scene: CreativeScene): CreativeScene {
  return {
    ...scene,
    id: id("scene"),
    name: `${scene.name} copy`,
    layers: scene.layers.map((layer) => ({ ...layer, id: id("layer"), keyframes: layer.keyframes.map((keyframe) => ({ ...keyframe, id: id("keyframe") })) })),
  };
}

export function moveCreativeScene(scenes: CreativeScene[], sceneId: string, direction: -1 | 1) {
  const index = scenes.findIndex((scene) => scene.id === sceneId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= scenes.length) return scenes;
  const next = [...scenes];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function upsertCreativeKeyframe(layer: CreativeLayer, property: CreativeKeyframeProperty, at: number): CreativeLayer {
  const normalizedAt = Math.max(0, Math.min(1, at));
  const value = layer[property];
  const existing = layer.keyframes.find((keyframe) => keyframe.property === property && Math.abs(keyframe.at - normalizedAt) < 0.02);
  const keyframe: CreativeKeyframe = existing
    ? { ...existing, at: normalizedAt, value }
    : { id: id("keyframe"), at: normalizedAt, property, value, easing: "ease-in-out" };
  return {
    ...layer,
    keyframes: [...layer.keyframes.filter((entry) => entry.id !== keyframe.id), keyframe].sort((left, right) => left.at - right.at),
  };
}

export function interpolateLayerValue(layer: CreativeLayer, property: CreativeKeyframeProperty, progress: number) {
  const frames = layer.keyframes.filter((frame) => frame.property === property).sort((left, right) => left.at - right.at);
  if (!frames.length) return layer[property];
  if (progress <= frames[0].at) return frames[0].value;
  if (progress >= frames[frames.length - 1].at) return frames[frames.length - 1].value;
  const rightIndex = frames.findIndex((frame) => frame.at >= progress);
  const left = frames[rightIndex - 1];
  const right = frames[rightIndex];
  const local = (progress - left.at) / Math.max(0.0001, right.at - left.at);
  const eased = local * local * (3 - 2 * local);
  return left.value + (right.value - left.value) * eased;
}

export async function saveCreativeDocument(document: CreativeDocument) {
  await runLocalStudioRequest("creativeDocuments", "readwrite", (store) => store.put({ ...document, updatedAt: Date.now() }));
}

export async function listCreativeDocuments(projectId?: string) {
  if (!("indexedDB" in window)) return [];
  const documents = await runLocalStudioRequest<CreativeDocument[]>("creativeDocuments", "readonly", (store) => store.getAll());
  return documents.filter((document) => document?.version === 1 && (!projectId || document.projectId === projectId)).sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function getCreativeDocument(documentId: string) {
  const document = await runLocalStudioRequest<CreativeDocument | undefined>("creativeDocuments", "readonly", (store) => store.get(documentId));
  return document?.version === 1 ? document : null;
}

export async function deleteCreativeDocument(documentId: string) {
  await runLocalStudioRequest("creativeDocuments", "readwrite", (store) => store.delete(documentId));
}
