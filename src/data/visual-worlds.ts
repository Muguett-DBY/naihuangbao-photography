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

const version = "20260809-2";
const image = (fileName: string) => `/images/visual-os-v7/${fileName}?v=${version}`;

const frames = {
  pavilion: { id: "pavilion", imageUrl: image("01-cream-atrium.webp"), labelKey: "visualWorlds.frames.pavilion", altKey: "visualWorlds.alt.pavilion", assetId: "visual-os-v7-01-cream-atrium" },
  paper: { id: "paper", imageUrl: image("02-paper-stair.webp"), labelKey: "visualWorlds.frames.paper", altKey: "visualWorlds.alt.paper", assetId: "visual-os-v7-02-paper-stair" },
  corridor: { id: "corridor", imageUrl: image("03-paper-corridor.webp"), labelKey: "visualWorlds.frames.paper", altKey: "visualWorlds.alt.paper", assetId: "visual-os-v7-03-paper-corridor" },
  gallery: { id: "gallery", imageUrl: image("04-circular-gallery.webp"), labelKey: "visualWorlds.frames.pavilion", altKey: "visualWorlds.alt.pavilion", assetId: "visual-os-v7-04-circular-gallery" },
  conservatory: { id: "conservatory", imageUrl: image("05-rain-observatory.webp"), labelKey: "visualWorlds.frames.conservatory", altKey: "visualWorlds.alt.conservatory", assetId: "visual-os-v7-05-rain-observatory" },
  greenhouse: { id: "greenhouse", imageUrl: image("06-wet-greenhouse.webp"), labelKey: "visualWorlds.frames.conservatory", altKey: "visualWorlds.alt.conservatory", assetId: "visual-os-v7-06-wet-greenhouse" },
  prism: { id: "prism", imageUrl: image("07-prismatic-rain.webp"), labelKey: "visualWorlds.frames.paper", altKey: "visualWorlds.alt.paper", assetId: "visual-os-v7-07-prismatic-rain" },
  water: { id: "water", imageUrl: image("08-water-table.webp"), labelKey: "visualWorlds.frames.paper", altKey: "visualWorlds.alt.paper", assetId: "visual-os-v7-08-water-table" },
  specimens: { id: "specimens", imageUrl: image("09-moss-specimens.webp"), labelKey: "visualWorlds.frames.drawers", altKey: "visualWorlds.alt.drawers", assetId: "visual-os-v7-09-moss-specimens" },
  cabinet: { id: "cabinet", imageUrl: image("10-pressed-cabinet.webp"), labelKey: "visualWorlds.frames.drawers", altKey: "visualWorlds.alt.drawers", assetId: "visual-os-v7-10-pressed-cabinet" },
  botanical: { id: "botanical", imageUrl: image("11-glass-botanical-lab.webp"), labelKey: "visualWorlds.frames.conservatory", altKey: "visualWorlds.alt.conservatory", assetId: "visual-os-v7-11-glass-botanical-lab" },
  drawers: { id: "drawers", imageUrl: image("12-seed-index.webp"), labelKey: "visualWorlds.frames.drawers", altKey: "visualWorlds.alt.drawers", assetId: "visual-os-v7-12-seed-index" },
  coral: { id: "coral", imageUrl: image("13-coral-print-room.webp"), labelKey: "visualWorlds.frames.coral", altKey: "visualWorlds.alt.coral", assetId: "visual-os-v7-13-coral-print-room" },
  printRoom: { id: "print-room", imageUrl: image("14-berry-glass-chamber.webp"), labelKey: "visualWorlds.frames.printRoom", altKey: "visualWorlds.alt.printRoom", assetId: "visual-os-v7-14-berry-glass-chamber" },
  amber: { id: "amber", imageUrl: image("15-amber-trays.webp"), labelKey: "visualWorlds.frames.coral", altKey: "visualWorlds.alt.coral", assetId: "visual-os-v7-15-amber-trays" },
  nightGarden: { id: "night-garden", imageUrl: image("16-night-light-lab.webp"), labelKey: "visualWorlds.frames.nightGarden", altKey: "visualWorlds.alt.nightGarden", assetId: "visual-os-v7-16-night-light-lab" },
} as const satisfies Record<string, VisualWorldFrame>;

export const visualWorlds: readonly VisualWorld[] = [
  {
    id: "dawn",
    labelKey: "visualWorlds.dawn.label",
    noteKey: "visualWorlds.dawn.note",
    frames: [frames.pavilion, frames.paper, frames.corridor, frames.gallery, frames.drawers, frames.coral],
  },
  {
    id: "rain",
    labelKey: "visualWorlds.rain.label",
    noteKey: "visualWorlds.rain.note",
    frames: [frames.conservatory, frames.greenhouse, frames.prism, frames.water, frames.botanical, frames.nightGarden],
  },
  {
    id: "afterglow",
    labelKey: "visualWorlds.afterglow.label",
    noteKey: "visualWorlds.afterglow.note",
    frames: [frames.coral, frames.printRoom, frames.amber, frames.specimens, frames.cabinet, frames.nightGarden],
  },
] as const;

export const visualWorldById = Object.freeze(
  Object.fromEntries(visualWorlds.map((world) => [world.id, world])) as Record<VisualWorldId, VisualWorld>,
);

export const visualWorldAssets = Object.freeze(Object.values(frames));
