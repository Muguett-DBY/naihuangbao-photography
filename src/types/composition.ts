export type CompositionImage = {
  id: string;
  src: string;
  name: string;
  blob?: Blob;
  transform?: CompositionImageTransform;
};

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
