export type ConceptPremiereFrame = {
  id:
    | "opening"
    | "prism"
    | "ribbon"
    | "afterimage"
    | "silk"
    | "glass"
    | "still-life"
    | "mirror"
    | "lens";
  imageUrl: string;
  altKey: string;
  kind: "opening" | "portrait" | "detail";
};

export type ConceptPremiereTrailFrame = {
  id: "wake" | "crossing" | "shards" | "ritual";
  imageUrl: string;
  altKey: string;
  orientation: "portrait" | "landscape";
};

const conceptPremiereAssetVersion = "20260801-2";
const conceptPremiereTrailAssetVersion = "20260801-3";
const conceptImage = (fileName: string) => `/images/concept-premiere/${fileName}?v=${conceptPremiereAssetVersion}`;
const conceptTrailImage = (fileName: string) => `/images/concept-premiere/${fileName}?v=${conceptPremiereTrailAssetVersion}`;

export const conceptPremiereFrames = [
  {
    id: "opening",
    imageUrl: conceptImage("premiere-opening-v1.webp"),
    altKey: "premiere.frames.openingAlt",
    kind: "opening",
  },
  {
    id: "prism",
    imageUrl: conceptImage("premiere-prism-v2.webp"),
    altKey: "premiere.frames.prismAlt",
    kind: "detail",
  },
  {
    id: "ribbon",
    imageUrl: conceptImage("premiere-ribbon-v2.webp"),
    altKey: "premiere.frames.ribbonAlt",
    kind: "portrait",
  },
  {
    id: "afterimage",
    imageUrl: conceptImage("premiere-afterimage-v2.webp"),
    altKey: "premiere.frames.afterimageAlt",
    kind: "portrait",
  },
  {
    id: "silk",
    imageUrl: conceptImage("premiere-silk-v1.webp"),
    altKey: "premiere.frames.silkAlt",
    kind: "portrait",
  },
  {
    id: "glass",
    imageUrl: conceptImage("premiere-glass-v1.webp"),
    altKey: "premiere.frames.glassAlt",
    kind: "portrait",
  },
  {
    id: "still-life",
    imageUrl: conceptImage("premiere-still-life-v1.webp"),
    altKey: "premiere.frames.stillLifeAlt",
    kind: "portrait",
  },
  {
    id: "mirror",
    imageUrl: conceptImage("premiere-mirror-v1.webp"),
    altKey: "premiere.frames.mirrorAlt",
    kind: "portrait",
  },
  {
    id: "lens",
    imageUrl: conceptImage("premiere-lens-v1.webp"),
    altKey: "premiere.frames.lensAlt",
    kind: "detail",
  },
] as const satisfies readonly ConceptPremiereFrame[];

export const conceptPremiereOpeningFrame = conceptPremiereFrames[0];
export const conceptPremierePrismFrame = conceptPremiereFrames[1];
export const conceptPremiereMotionFrames = conceptPremiereFrames.slice(2);

export const conceptPremiereTrailFrames = [
  {
    id: "wake",
    imageUrl: conceptTrailImage("premiere-wake-v3.webp"),
    altKey: "premiere.frames.wakeAlt",
    orientation: "portrait",
  },
  {
    id: "crossing",
    imageUrl: conceptTrailImage("premiere-crossing-v3.webp"),
    altKey: "premiere.frames.crossingAlt",
    orientation: "portrait",
  },
  {
    id: "shards",
    imageUrl: conceptTrailImage("premiere-shards-v3.webp"),
    altKey: "premiere.frames.shardsAlt",
    orientation: "landscape",
  },
  {
    id: "ritual",
    imageUrl: conceptTrailImage("premiere-ritual-v3.webp"),
    altKey: "premiere.frames.ritualAlt",
    orientation: "portrait",
  },
] as const satisfies readonly ConceptPremiereTrailFrame[];
