import type { TFunction } from "i18next";

export const siteConfig = {
  brandName: "奶黄包摄影",
  city: "南京",
  domain: "shoot.custard.top",
  tagline: "南京女生写真与情侣约拍",
  description:
    "偏柔雾胶片感的自然约拍，适合日常记录、江南感写真、情侣纪念和轻松陪拍。",
  contactStatus: "小红书私信咨询",
  contactHint: "小红书私信预约，确认风格和档期后锁定拍摄时间。",
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
