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
    title: "玻璃相纸",
    imageUrl: "/images/cinematic/atmosphere-01.webp",
    alt: "暖色玻璃相纸与电影光轨品牌氛围图",
    kind: "atmosphere",
  },
  {
    id: "atmosphere-02",
    title: "暗房光轨",
    imageUrl: "/images/cinematic/atmosphere-02.webp",
    alt: "暗房空间里的金色胶片光轨品牌氛围图",
    kind: "atmosphere",
  },
  {
    id: "atmosphere-03",
    title: "棱镜微光",
    imageUrl: "/images/cinematic/atmosphere-03.webp",
    alt: "棱镜玻璃与柔暖人像相纸品牌氛围图",
    kind: "atmosphere",
  },
  {
    id: "atmosphere-04",
    title: "焦糖暗幕",
    imageUrl: "/images/cinematic/atmosphere-04.webp",
    alt: "焦糖色暗幕与透明相纸品牌氛围图",
    kind: "atmosphere",
  },
  {
    id: "atmosphere-05",
    title: "曲线胶片",
    imageUrl: "/images/cinematic/atmosphere-05.webp",
    alt: "曲线胶片走廊与暖色光带品牌氛围图",
    kind: "atmosphere",
  },
  {
    id: "atmosphere-06",
    title: "光带走廊",
    imageUrl: "/images/cinematic/atmosphere-06.webp",
    alt: "暖色光带穿过玻璃相纸走廊品牌氛围图",
    kind: "atmosphere",
  },
  {
    id: "atmosphere-07",
    title: "悬浮相纸",
    imageUrl: "/images/cinematic/atmosphere-07.webp",
    alt: "悬浮相纸与金色镜头光斑品牌氛围图",
    kind: "atmosphere",
  },
  {
    id: "atmosphere-08",
    title: "胶片终幕",
    imageUrl: "/images/cinematic/atmosphere-08.webp",
    alt: "电影胶片终幕与透明照片墙品牌氛围图",
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
): PhotoItem[] {
  return getPhotosByStyle(photos, style);
}
