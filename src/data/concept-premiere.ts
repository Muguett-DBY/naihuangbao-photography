export type ConceptPremiereFrame = {
  id: "opening" | "silk" | "glass" | "still-life" | "mirror" | "lens";
  imageUrl: string;
  altKey: string;
  kind: "opening" | "portrait" | "detail";
};

const conceptPremiereAssetVersion = "20260730-1";
const conceptImage = (fileName: string) => `/images/concept-premiere/${fileName}?v=${conceptPremiereAssetVersion}`;

export const conceptPremiereFrames = [
  {
    id: "opening",
    imageUrl: conceptImage("premiere-opening-v1.webp"),
    altKey: "premiere.frames.openingAlt",
    kind: "opening",
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
export const conceptPremiereMotionFrames = conceptPremiereFrames.slice(1);
