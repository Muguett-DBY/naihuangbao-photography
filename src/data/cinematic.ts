import { getPhotosByStyle } from "../lib/gallery";
import type { PhotoItem, PhotoStyle } from "../types/photo";

export type AtmosphereGalleryItem = {
  id: string;
  title: string;
  imageUrl: string;
  alt: string;
  kind: "atmosphere";
};

export type GalleryDisplayItem = PhotoItem | AtmosphereGalleryItem;

export const cinematicHeroAssets = {
  background: "/images/cinematic/hero-studio.webp",
  mobileBackground: "/images/cinematic/hero-studio-mobile.webp",
};

export const cinematicGalleryAssets = {
  background: "/images/cinematic/gallery-corridor.webp",
  mobileBackground: "/images/cinematic/gallery-corridor-mobile.webp",
};

export const cinematicDetailAssets = [
  "/images/cinematic/studio-detail-01.webp",
  "/images/cinematic/studio-detail-02.webp",
  "/images/cinematic/studio-detail-03.webp",
  "/images/cinematic/studio-detail-04.webp",
  "/images/cinematic/studio-detail-05.webp",
  "/images/cinematic/studio-detail-06.webp",
  "/images/cinematic/studio-detail-07.webp",
  "/images/cinematic/studio-detail-08.webp",
];

export const atmosphereGalleryItems: AtmosphereGalleryItem[] = [
  {
    id: "atmosphere-01",
    title: "暖光影棚",
    imageUrl: "/images/cinematic/atmosphere-01.webp",
    alt: "暖色影棚中的猫和小狗品牌氛围图",
    kind: "atmosphere",
  },
  {
    id: "atmosphere-02",
    title: "胶片小径",
    imageUrl: "/images/cinematic/atmosphere-02.webp",
    alt: "奶油色影棚里的胶片轨道品牌氛围图",
    kind: "atmosphere",
  },
  {
    id: "atmosphere-03",
    title: "花窗午后",
    imageUrl: "/images/cinematic/atmosphere-03.webp",
    alt: "柔光花窗与相纸陈列品牌氛围图",
    kind: "atmosphere",
  },
  {
    id: "atmosphere-04",
    title: "焦糖相纸",
    imageUrl: "/images/cinematic/atmosphere-04.webp",
    alt: "焦糖暖色相纸和影棚道具品牌氛围图",
    kind: "atmosphere",
  },
  {
    id: "atmosphere-05",
    title: "柔纱轨道",
    imageUrl: "/images/cinematic/atmosphere-05.webp",
    alt: "柔纱与胶片轨道构成的品牌氛围图",
    kind: "atmosphere",
  },
  {
    id: "atmosphere-06",
    title: "奶油布景",
    imageUrl: "/images/cinematic/atmosphere-06.webp",
    alt: "奶油色宠物影棚与相机道具品牌氛围图",
    kind: "atmosphere",
  },
  {
    id: "atmosphere-07",
    title: "蜜桃光影",
    imageUrl: "/images/cinematic/atmosphere-07.webp",
    alt: "蜜桃色自然光与相纸品牌氛围图",
    kind: "atmosphere",
  },
  {
    id: "atmosphere-08",
    title: "相册终幕",
    imageUrl: "/images/cinematic/atmosphere-08.webp",
    alt: "暖色相册陈列和胶片装置品牌氛围图",
    kind: "atmosphere",
  },
];

export const cinematicAssetManifest = [
  cinematicHeroAssets.background,
  cinematicHeroAssets.mobileBackground,
  cinematicGalleryAssets.background,
  cinematicGalleryAssets.mobileBackground,
  ...atmosphereGalleryItems.map((item) => item.imageUrl),
  ...cinematicDetailAssets,
];

export function isAtmosphereItem(item: GalleryDisplayItem): item is AtmosphereGalleryItem {
  return "kind" in item && item.kind === "atmosphere";
}

export function getGalleryDisplayItems(
  photos: PhotoItem[],
  style: PhotoStyle | "all",
): GalleryDisplayItem[] {
  const realPhotos = getPhotosByStyle(photos, style);
  if (style !== "all") {
    return realPhotos;
  }
  return [...realPhotos, ...atmosphereGalleryItems];
}
