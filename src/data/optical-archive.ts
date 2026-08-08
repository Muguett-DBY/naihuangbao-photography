export type OpticalArchiveRole =
  | "environment"
  | "optical"
  | "archive"
  | "route"
  | "editor";

export type OpticalArchiveAsset = {
  id: string;
  imageUrl: string;
  altKey: string;
  width: number;
  height: number;
  role: OpticalArchiveRole;
  routes: readonly string[];
  containsPeople: false;
};

const assetVersion = "20260808-1";
const opticalImage = (fileName: string) => `/images/optical-archive/${fileName}?v=${assetVersion}`;

export const opticalArchiveAssets: readonly OpticalArchiveAsset[] = [
  { id: "garden-hero", imageUrl: opticalImage("optical-garden-hero-v1.webp"), altKey: "opticalArchive.gardenHeroAlt", width: 1672, height: 941, role: "environment", routes: ["/"], containsPeople: false },
  { id: "rain-corridor", imageUrl: opticalImage("rain-window-corridor-v1.webp"), altKey: "opticalArchive.rainCorridorAlt", width: 1672, height: 941, role: "environment", routes: ["/", "/gallery"], containsPeople: false },
  { id: "lens-stilllife", imageUrl: opticalImage("prism-lens-stilllife-v1.webp"), altKey: "opticalArchive.lensStilllifeAlt", width: 1536, height: 1024, role: "optical", routes: ["/", "/products"], containsPeople: false },
  { id: "contact-sheet", imageUrl: opticalImage("archive-contact-sheet-v1.webp"), altKey: "opticalArchive.contactSheetAlt", width: 1448, height: 1086, role: "archive", routes: ["/gallery"], containsPeople: false },
  { id: "bamboo-shadow", imageUrl: opticalImage("bamboo-shadow-ribbon-v1.webp"), altKey: "opticalArchive.bambooShadowAlt", width: 1122, height: 1402, role: "environment", routes: ["/", "/gallery"], containsPeople: false },
  { id: "darkroom", imageUrl: opticalImage("darkroom-light-table-v1.webp"), altKey: "opticalArchive.darkroomAlt", width: 1122, height: 1402, role: "editor", routes: ["/editor"], containsPeople: false },
  { id: "course-light", imageUrl: opticalImage("course-light-study-v1.webp"), altKey: "opticalArchive.courseLightAlt", width: 1672, height: 941, role: "route", routes: ["/courses"], containsPeople: false },
  { id: "color-glass", imageUrl: opticalImage("color-glass-study-v1.webp"), altKey: "opticalArchive.colorGlassAlt", width: 1672, height: 941, role: "route", routes: ["/products", "/editor"], containsPeople: false },
  { id: "print-folio", imageUrl: opticalImage("print-folio-v1.webp"), altKey: "opticalArchive.printFolioAlt", width: 1672, height: 941, role: "route", routes: ["/shop"], containsPeople: false },
  { id: "booking-table", imageUrl: opticalImage("booking-garden-table-v1.webp"), altKey: "opticalArchive.bookingTableAlt", width: 1672, height: 941, role: "route", routes: ["/booking"], containsPeople: false },
  { id: "moon-gate-night", imageUrl: opticalImage("rain-moon-gate-night-v1.webp"), altKey: "opticalArchive.moonGateNightAlt", width: 1672, height: 941, role: "environment", routes: ["/", "/gallery"], containsPeople: false },
  { id: "camellia-prism", imageUrl: opticalImage("camellia-prism-macro-v1.webp"), altKey: "opticalArchive.camelliaPrismAlt", width: 1536, height: 1024, role: "editor", routes: ["/editor"], containsPeople: false },
  { id: "paper-ripple", imageUrl: opticalImage("paper-ripple-study-v1.webp"), altKey: "opticalArchive.paperRippleAlt", width: 1536, height: 1024, role: "optical", routes: ["/", "/editor"], containsPeople: false },
];

export const opticalArchiveById = Object.freeze(
  Object.fromEntries(opticalArchiveAssets.map((asset) => [asset.id, asset])) as Record<string, OpticalArchiveAsset>,
);

export const opticalGardenFrames = opticalArchiveAssets.filter((asset) => asset.routes.includes("/"));
export const editorSampleAssets = opticalArchiveAssets.filter((asset) => asset.role === "editor" || asset.id === "paper-ripple");

export function getOpticalArchiveAssetsForRoute(route: string) {
  return opticalArchiveAssets.filter((asset) => asset.routes.includes(route));
}
