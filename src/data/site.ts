import type { TFunction } from "i18next";

export const siteConfig = {
  brandName: "奶黄包摄影",
  city: "南京",
  domain: "shoot.custard.top",
  tagline: "南京女生写真与情侣约拍",
  description:
    "南京个人摄影师，提供女生写真、情侣约拍与轻松自然的城市旅拍，拍摄前沟通风格，全程提供动作引导。",
  contactStatus: "南京约拍开放中",
  contactHint: "查看作品与套餐后，可以直接提交预约；也可以通过小红书先聊风格和档期。",
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
