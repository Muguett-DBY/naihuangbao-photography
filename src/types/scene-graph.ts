export type SceneTransition = "cut" | "veil" | "focus" | "drift" | "slice";

export type SceneMotion = {
  transition: SceneTransition;
  durationMs: number;
  intensity: number;
  depth: number;
  focusX: number;
  focusY: number;
};

export type SceneGraphNode = SceneMotion & {
  id: string;
  assetId: string;
  imageUrl: string;
  labelKey: string;
  altKey: string;
};

export type SceneGraph = {
  id: string;
  version: 1;
  loop: boolean;
  nodes: readonly SceneGraphNode[];
};

export const DEFAULT_SCENE_MOTION: SceneMotion = {
  transition: "veil",
  durationMs: 900,
  intensity: 0.65,
  depth: 0.5,
  focusX: 0.5,
  focusY: 0.5,
};
