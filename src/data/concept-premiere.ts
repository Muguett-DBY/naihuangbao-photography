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
  id: "veil" | "run" | "flora" | "night";
  imageUrl: string;
  altKey: string;
  orientation: "portrait" | "landscape";
};

export type ConceptPremiereFeatureFrame = {
  id: "veil" | "run" | "reflection" | "flora" | "night";
  imageUrl: string;
  altKey: string;
  orientation: "portrait" | "landscape";
  role: "portrait" | "motion" | "duet" | "detail" | "night";
};

export type ConceptPremierePortalFrame = {
  id: "luminance" | "surge" | "prism-run" | "duet" | "film";
  imageUrl: string;
  altKey: string;
  orientation: "portrait" | "landscape";
};

const conceptPremiereAssetVersion = "20260801-2";
const conceptPremierePortalAssetVersion = "20260801-4";
const conceptPremiereFeatureAssetVersion = "20260801-5";
const conceptImage = (fileName: string) => `/images/concept-premiere/${fileName}?v=${conceptPremiereAssetVersion}`;
const conceptPortalImage = (fileName: string) => `/images/concept-premiere/${fileName}?v=${conceptPremierePortalAssetVersion}`;
const conceptFeatureImage = (fileName: string) => `/images/concept-premiere/${fileName}?v=${conceptPremiereFeatureAssetVersion}`;

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

export const conceptPremierePortalFrames = [
  {
    id: "luminance",
    imageUrl: conceptPortalImage("premiere-luminance-v4.webp"),
    altKey: "premiere.frames.luminanceAlt",
    orientation: "landscape",
  },
  {
    id: "surge",
    imageUrl: conceptPortalImage("premiere-surge-v4.webp"),
    altKey: "premiere.frames.surgeAlt",
    orientation: "portrait",
  },
  {
    id: "prism-run",
    imageUrl: conceptPortalImage("premiere-prism-run-v4.webp"),
    altKey: "premiere.frames.prismRunAlt",
    orientation: "landscape",
  },
  {
    id: "duet",
    imageUrl: conceptPortalImage("premiere-duet-v4.webp"),
    altKey: "premiere.frames.duetAlt",
    orientation: "portrait",
  },
  {
    id: "film",
    imageUrl: conceptPortalImage("premiere-film-v4.webp"),
    altKey: "premiere.frames.filmAlt",
    orientation: "portrait",
  },
] as const satisfies readonly ConceptPremierePortalFrame[];

export const conceptPremierePortalLead = conceptPremierePortalFrames[0];
export const conceptPremierePortalPortrait = conceptPremierePortalFrames[1];
export const conceptPremierePortalPrism = conceptPremierePortalFrames[2];
export const conceptPremierePortalDuet = conceptPremierePortalFrames[3];
export const conceptPremierePortalFilm = conceptPremierePortalFrames[4];

export const conceptPremiereFeatureFrames = [
  {
    id: "veil",
    imageUrl: conceptFeatureImage("premiere-veil-v5.webp"),
    altKey: "premiere.frames.veilAlt",
    orientation: "portrait",
    role: "portrait",
  },
  {
    id: "run",
    imageUrl: conceptFeatureImage("premiere-run-v5.webp"),
    altKey: "premiere.frames.runAlt",
    orientation: "landscape",
    role: "motion",
  },
  {
    id: "reflection",
    imageUrl: conceptFeatureImage("premiere-reflection-v5.webp"),
    altKey: "premiere.frames.reflectionAlt",
    orientation: "portrait",
    role: "duet",
  },
  {
    id: "flora",
    imageUrl: conceptFeatureImage("premiere-flora-v5.webp"),
    altKey: "premiere.frames.floraAlt",
    orientation: "landscape",
    role: "detail",
  },
  {
    id: "night",
    imageUrl: conceptFeatureImage("premiere-night-v5.webp"),
    altKey: "premiere.frames.nightAlt",
    orientation: "landscape",
    role: "night",
  },
] as const satisfies readonly ConceptPremiereFeatureFrame[];

export const conceptPremiereFeatureVeil = conceptPremiereFeatureFrames[0];
export const conceptPremiereFeatureRun = conceptPremiereFeatureFrames[1];
export const conceptPremiereFeatureReflection = conceptPremiereFeatureFrames[2];
export const conceptPremiereFeatureFlora = conceptPremiereFeatureFrames[3];
export const conceptPremiereFeatureNight = conceptPremiereFeatureFrames[4];

export const conceptPremiereColdOpenFrames = [
  conceptPremierePortalPortrait,
  conceptPremiereFeatureVeil,
  conceptPremiereFeatureRun,
  conceptPremiereFeatureReflection,
  conceptPremiereFeatureNight,
] as const;

export const conceptPremiereTrailFrames = [
  conceptPremiereFeatureVeil,
  conceptPremiereFeatureRun,
  conceptPremiereFeatureFlora,
  conceptPremiereFeatureNight,
] as const satisfies readonly ConceptPremiereTrailFrame[];

// Preserve three slots for real client work inside the high-tier ten-plane budget.
export const conceptPremiereImmersiveFrames = [
  conceptPremierePortalLead,
  conceptPremiereFeatureRun,
  conceptPremiereFeatureVeil,
  conceptPremiereFeatureReflection,
  conceptPremiereFeatureFlora,
  conceptPremiereFeatureNight,
  conceptPremierePortalDuet,
] as const;
