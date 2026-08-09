export type CompositionImage = {
  id: string;
  src: string;
  name: string;
  blob?: Blob;
  transform?: CompositionImageTransform;
  visible?: boolean;
  opacity?: number;
  blendMode?: CompositionBlendMode;
  locked?: boolean;
  groupId?: string;
  crop?: CompositionCrop;
  adjustments?: CompositionAdjustments;
  mask?: CompositionMask;
};

export type CompositionBlendMode = "source-over" | "multiply" | "screen" | "soft-light";

export type CompositionMask = "none" | "circle" | "rounded";

export type CompositionCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CompositionAdjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  blur: number;
};

export type CompositionArtboardPreset = "auto" | "landscape" | "portrait" | "square" | "story";

export type CompositionImageTransform = {
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
};

export type CompositionTextAlign = "left" | "center" | "right";

export const DEFAULT_COMPOSITION_TRANSFORM: CompositionImageTransform = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};

export const DEFAULT_COMPOSITION_CROP: CompositionCrop = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

export const DEFAULT_COMPOSITION_ADJUSTMENTS: CompositionAdjustments = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  temperature: 0,
  blur: 0,
};
