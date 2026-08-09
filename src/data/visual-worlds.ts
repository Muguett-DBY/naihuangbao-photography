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

const version = "20260809-8";
const image = (fileName: string) => `/images/visual-os-v8/${fileName}?v=${version}`;

const frames = {
  pavilion: { id: "pavilion", imageUrl: image("01-cream-paper-pavilion.webp"), labelKey: "visualWorlds.frames.pavilion", altKey: "visualWorlds.alt.pavilion", assetId: "visual-os-v8-01-cream-paper-pavilion" },
  paper: { id: "paper", imageUrl: image("02-cut-paper-staircase.webp"), labelKey: "visualWorlds.frames.paper", altKey: "visualWorlds.alt.paper", assetId: "visual-os-v8-02-cut-paper-staircase" },
  corridor: { id: "corridor", imageUrl: image("03-custard-sun-window.webp"), labelKey: "visualWorlds.frames.paper", altKey: "visualWorlds.alt.paper", assetId: "visual-os-v8-03-custard-sun-window" },
  gallery: { id: "gallery", imageUrl: image("04-coral-paper-orbit.webp"), labelKey: "visualWorlds.frames.pavilion", altKey: "visualWorlds.alt.pavilion", assetId: "visual-os-v8-04-coral-paper-orbit" },
  conservatory: { id: "conservatory", imageUrl: image("05-water-glass-prism-table.webp"), labelKey: "visualWorlds.frames.conservatory", altKey: "visualWorlds.alt.conservatory", assetId: "visual-os-v8-05-water-glass-prism-table" },
  greenhouse: { id: "greenhouse", imageUrl: image("06-rain-lens-grid.webp"), labelKey: "visualWorlds.frames.conservatory", altKey: "visualWorlds.alt.conservatory", assetId: "visual-os-v8-06-rain-lens-grid" },
  prism: { id: "prism", imageUrl: image("07-frosted-glass-tide.webp"), labelKey: "visualWorlds.frames.paper", altKey: "visualWorlds.alt.paper", assetId: "visual-os-v8-07-frosted-glass-tide" },
  water: { id: "water", imageUrl: image("08-amber-caustic-room.webp"), labelKey: "visualWorlds.frames.paper", altKey: "visualWorlds.alt.paper", assetId: "visual-os-v8-08-amber-caustic-room" },
  specimens: { id: "specimens", imageUrl: image("09-moss-specimen-drawer.webp"), labelKey: "visualWorlds.frames.drawers", altKey: "visualWorlds.alt.drawers", assetId: "visual-os-v8-09-moss-specimen-drawer" },
  cabinet: { id: "cabinet", imageUrl: image("10-fern-shadow-index.webp"), labelKey: "visualWorlds.frames.drawers", altKey: "visualWorlds.alt.drawers", assetId: "visual-os-v8-10-fern-shadow-index" },
  botanical: { id: "botanical", imageUrl: image("11-seed-pod-museum.webp"), labelKey: "visualWorlds.frames.conservatory", altKey: "visualWorlds.alt.conservatory", assetId: "visual-os-v8-11-seed-pod-museum" },
  drawers: { id: "drawers", imageUrl: image("12-botanical-glass-herbarium.webp"), labelKey: "visualWorlds.frames.drawers", altKey: "visualWorlds.alt.drawers", assetId: "visual-os-v8-12-botanical-glass-herbarium" },
  coral: { id: "coral", imageUrl: image("13-coral-pigment-press.webp"), labelKey: "visualWorlds.frames.coral", altKey: "visualWorlds.alt.coral", assetId: "visual-os-v8-13-coral-pigment-press" },
  printRoom: { id: "print-room", imageUrl: image("14-berry-ink-ribbons.webp"), labelKey: "visualWorlds.frames.printRoom", altKey: "visualWorlds.alt.printRoom", assetId: "visual-os-v8-14-berry-ink-ribbons" },
  amber: { id: "amber", imageUrl: image("15-printmakers-color-table.webp"), labelKey: "visualWorlds.frames.coral", altKey: "visualWorlds.alt.coral", assetId: "visual-os-v8-15-printmakers-color-table" },
  nightGarden: { id: "night-garden", imageUrl: image("17-night-projection-arch.webp"), labelKey: "visualWorlds.frames.nightGarden", altKey: "visualWorlds.alt.nightGarden", assetId: "visual-os-v8-17-night-projection-arch" },
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
