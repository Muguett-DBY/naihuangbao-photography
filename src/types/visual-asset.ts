export type VisualAssetOrientation = "landscape" | "portrait" | "square";

export type VisualAssetLink = {
  id: string;
  chapterId?: string;
};

export type VisualAsset = {
  id: string;
  src: string;
  avif: string;
  responsive: {
    width640: string;
    width960: string;
    width640Avif: string;
    width960Avif: string;
  };
  alt: string;
  note?: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: VisualAssetOrientation;
  dominantColor: string;
  colorVector: [number, number, number];
  focalPoint: { x: number; y: number };
  palette: string[];
  descriptors: string[];
  projectIds: string[];
  storyLinks: VisualAssetLink[];
  provenance: {
    kind: "generated-concept";
    sourceAsset?: string;
    usage: "personal-practice";
  };
};

export type VisualAssetManifest = {
  schemaVersion: 1;
  generatedFrom: string[];
  stats: {
    assets: number;
    projects: number;
    stories: number;
  };
  assets: VisualAsset[];
};
