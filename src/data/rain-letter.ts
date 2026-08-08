export type RainLetterFrame = {
  id: "garden" | "window" | "lane";
  imageUrl: string;
  altKey: string;
  titleKey: string;
  copyKey: string;
};

const rainLetterAssetVersion = "20260808-6";
const rainLetterImage = (fileName: string) =>
  `/images/concept-premiere/${fileName}?v=${rainLetterAssetVersion}`;

export const rainLetterFrames = [
  {
    id: "garden",
    imageUrl: rainLetterImage("rain-garden-lead-v6.webp"),
    altKey: "rainLetter.frames.gardenAlt",
    titleKey: "rainLetter.frames.gardenTitle",
    copyKey: "rainLetter.frames.gardenCopy",
  },
  {
    id: "window",
    imageUrl: rainLetterImage("rain-window-portrait-v6.webp"),
    altKey: "rainLetter.frames.windowAlt",
    titleKey: "rainLetter.frames.windowTitle",
    copyKey: "rainLetter.frames.windowCopy",
  },
  {
    id: "lane",
    imageUrl: rainLetterImage("rain-lane-night-v6.webp"),
    altKey: "rainLetter.frames.laneAlt",
    titleKey: "rainLetter.frames.laneTitle",
    copyKey: "rainLetter.frames.laneCopy",
  },
] as const satisfies readonly RainLetterFrame[];
