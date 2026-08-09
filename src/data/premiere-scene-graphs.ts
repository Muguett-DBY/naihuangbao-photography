import { visualWorlds, type VisualWorldId } from "./visual-worlds";
import { createSceneGraph } from "../lib/scene-graph";
import type { SceneGraph, SceneTransition } from "../types/scene-graph";

const transitions: SceneTransition[] = ["veil", "focus", "drift", "slice", "cut", "focus"];

export const premiereSceneGraphs = Object.freeze(Object.fromEntries(visualWorlds.map((world, worldIndex) => [
  world.id,
  createSceneGraph(`premiere-${world.id}`, world.frames.map((frame, index) => ({
    ...frame,
    transition: transitions[(index + worldIndex) % transitions.length],
    durationMs: 760 + index * 90,
    intensity: 0.48 + index * 0.07,
    depth: 0.35 + ((index + worldIndex) % 4) * 0.14,
    focusX: 0.34 + ((index * 23 + worldIndex * 11) % 36) / 100,
    focusY: 0.36 + ((index * 17 + worldIndex * 7) % 30) / 100,
  }))),
])) as Record<VisualWorldId, SceneGraph>);
