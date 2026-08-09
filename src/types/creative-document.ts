import type { WorkspaceAssetReference } from "./workspace-project";

export type CreativeTransition = "cut" | "fade" | "wipe" | "drift" | "focus";
export type CreativeAspect = "landscape" | "portrait" | "square" | "story";
export type CreativeKeyframeProperty = "x" | "y" | "scale" | "rotation" | "opacity";

export type CreativeKeyframe = {
  id: string;
  at: number;
  property: CreativeKeyframeProperty;
  value: number;
  easing: "linear" | "ease-in" | "ease-out" | "ease-in-out";
};

export type CreativeLayer = {
  id: string;
  name: string;
  asset: WorkspaceAssetReference | null;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  blendMode: "normal" | "multiply" | "screen" | "soft-light";
  locked: boolean;
  keyframes: CreativeKeyframe[];
};

export type CreativeScene = {
  id: string;
  name: string;
  durationMs: number;
  transition: CreativeTransition;
  background: string;
  layers: CreativeLayer[];
};

export type CreativeDocument = {
  id: string;
  version: 1;
  projectType: "creative-document";
  projectId: string;
  name: string;
  aspect: CreativeAspect;
  scenes: CreativeScene[];
  createdAt: number;
  updatedAt: number;
};
