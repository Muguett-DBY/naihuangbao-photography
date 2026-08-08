import type { TFunction } from "i18next";

export const siteConfig = {
  brandName: "奶黄包摄影",
  city: "南京",
  domain: "shoot.custard.top",
  tagline: "个人视觉档案与本地创作实验",
  description:
    "一个持续生长的个人视觉练习项目，用来探索摄影、互动叙事、浏览器图形和本地优先创作工具。",
  contactStatus: "个人练习项目",
  contactHint: "这里记录视觉实验、制作过程与可在浏览器中直接使用的创作工具。",
  xiaohongshuProfile:
    "https://www.xiaohongshu.com/user/profile/60f5b14b000000002002fa9f",
};

export const STYLE_KEYS = ["all", "jiangnan", "street", "park", "sweet", "couple", "indoor"] as const;
export type StyleKey = (typeof STYLE_KEYS)[number];

export function getStyleLabels(t: TFunction): Record<StyleKey, string> {
  return {
    all: t("gallery.filters.all"),
    jiangnan: t("gallery.filters.jiangnan"),
    street: t("gallery.filters.street"),
    park: t("gallery.filters.park"),
    sweet: t("gallery.filters.sweet"),
    couple: t("gallery.filters.couple"),
    indoor: t("gallery.filters.indoor"),
  };
}
