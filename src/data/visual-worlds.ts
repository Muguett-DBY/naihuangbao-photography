export type VisualWorldId = "dawn" | "rain" | "afterglow";

export type VisualWorldFrame = {
  id: string;
  imageUrl: string;
  labelKey: string;
  altKey: string;
  assetId: string;
};

export type VisualWorld = {
  id: VisualWorldId;
  labelKey: string;
  noteKey: string;
  frames: readonly VisualWorldFrame[];
};

const version = "20260809-1";
const image = (fileName: string) => `/images/visual-os-v6/${fileName}?v=${version}`;

const frames = {
  pavilion: { id: "pavilion", imageUrl: image("01-cream-pavilion.webp"), labelKey: "visualWorlds.frames.pavilion", altKey: "visualWorlds.alt.pavilion", assetId: "visual-os-v6-01-cream-pavilion" },
  conservatory: { id: "conservatory", imageUrl: image("02-rain-conservatory.webp"), labelKey: "visualWorlds.frames.conservatory", altKey: "visualWorlds.alt.conservatory", assetId: "visual-os-v6-02-rain-conservatory" },
  coral: { id: "coral", imageUrl: image("03-coral-chamber.webp"), labelKey: "visualWorlds.frames.coral", altKey: "visualWorlds.alt.coral", assetId: "visual-os-v6-03-coral-chamber" },
  printRoom: { id: "print-room", imageUrl: image("04-berry-print-room.webp"), labelKey: "visualWorlds.frames.printRoom", altKey: "visualWorlds.alt.printRoom", assetId: "visual-os-v6-04-berry-print-room" },
  paper: { id: "paper", imageUrl: image("05-paper-rain-macro.webp"), labelKey: "visualWorlds.frames.paper", altKey: "visualWorlds.alt.paper", assetId: "visual-os-v6-05-paper-rain-macro" },
  drawers: { id: "drawers", imageUrl: image("06-archive-drawers.webp"), labelKey: "visualWorlds.frames.drawers", altKey: "visualWorlds.alt.drawers", assetId: "visual-os-v6-06-archive-drawers" },
  nightGarden: { id: "night-garden", imageUrl: image("07-night-glass-garden.webp"), labelKey: "visualWorlds.frames.nightGarden", altKey: "visualWorlds.alt.nightGarden", assetId: "visual-os-v6-07-night-glass-garden" },
} as const satisfies Record<string, VisualWorldFrame>;

export const visualWorlds: readonly VisualWorld[] = [
  {
    id: "dawn",
    labelKey: "visualWorlds.dawn.label",
    noteKey: "visualWorlds.dawn.note",
    frames: [frames.pavilion, frames.paper, frames.coral, frames.drawers, frames.conservatory],
  },
  {
    id: "rain",
    labelKey: "visualWorlds.rain.label",
    noteKey: "visualWorlds.rain.note",
    frames: [frames.conservatory, frames.drawers, frames.paper, frames.nightGarden, frames.pavilion],
  },
  {
    id: "afterglow",
    labelKey: "visualWorlds.afterglow.label",
    noteKey: "visualWorlds.afterglow.note",
    frames: [frames.coral, frames.printRoom, frames.nightGarden, frames.drawers, frames.pavilion],
  },
] as const;

export const visualWorldById = Object.freeze(
  Object.fromEntries(visualWorlds.map((world) => [world.id, world])) as Record<VisualWorldId, VisualWorld>,
);

export const visualWorldAssets = Object.freeze(Object.values(frames));
