import { DEFAULT_SCENE_MOTION, type SceneGraph, type SceneGraphNode, type SceneMotion } from "../types/scene-graph";

export function normalizeSceneMotion(motion?: Partial<SceneMotion>): SceneMotion {
  return {
    transition: motion?.transition ?? DEFAULT_SCENE_MOTION.transition,
    durationMs: Math.round(Math.max(180, Math.min(4_000, motion?.durationMs ?? DEFAULT_SCENE_MOTION.durationMs))),
    intensity: Math.max(0, Math.min(1, motion?.intensity ?? DEFAULT_SCENE_MOTION.intensity)),
    depth: Math.max(0, Math.min(1, motion?.depth ?? DEFAULT_SCENE_MOTION.depth)),
    focusX: Math.max(0, Math.min(1, motion?.focusX ?? DEFAULT_SCENE_MOTION.focusX)),
    focusY: Math.max(0, Math.min(1, motion?.focusY ?? DEFAULT_SCENE_MOTION.focusY)),
  };
}

export function createSceneGraph(id: string, nodes: Array<Omit<SceneGraphNode, keyof SceneMotion> & Partial<SceneMotion>>, loop = true): SceneGraph {
  if (!id.trim() || nodes.length === 0) throw new Error("SceneGraph requires an id and at least one node");
  const seen = new Set<string>();
  return {
    id,
    version: 1,
    loop,
    nodes: nodes.map((node) => {
      if (!node.id.trim() || seen.has(node.id)) throw new Error(`Invalid SceneGraph node: ${node.id}`);
      seen.add(node.id);
      return { ...node, ...normalizeSceneMotion(node) };
    }),
  };
}

export function getSceneIndexForProgress(progress: number, nodeCount: number) {
  if (nodeCount <= 1) return 0;
  return Math.min(nodeCount - 1, Math.floor(Math.max(0, Math.min(0.9999, progress)) * nodeCount));
}

export function applySceneNodeStyle(element: HTMLElement, node: SceneGraphNode) {
  element.dataset.sceneTransition = node.transition;
  element.style.setProperty("--scene-duration", `${node.durationMs}ms`);
  element.style.setProperty("--scene-intensity", node.intensity.toFixed(3));
  element.style.setProperty("--scene-depth", node.depth.toFixed(3));
  element.style.setProperty("--scene-focus-x", `${(node.focusX * 100).toFixed(2)}%`);
  element.style.setProperty("--scene-focus-y", `${(node.focusY * 100).toFixed(2)}%`);
}
