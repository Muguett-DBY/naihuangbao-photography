import { faqs, processSteps } from "./faq";
import { packages, serviceAddOns, servicePolicies } from "./packages";
import { siteConfig } from "./site";
import type {
  ContentKey,
  FaqItem,
  PackageItem,
  PartialSiteContent,
  SectionCopy,
  ServiceAddOns,
  ServicePolicy,
  SiteConfigContent,
  SiteContent,
  WhyCard,
} from "../types/content";

export const contentKeys = [
  "siteConfig",
  "packages",
  "serviceAddOns",
  "servicePolicies",
  "faqs",
  "processSteps",
  "whyCards",
  "sectionCopy",
] as const satisfies readonly ContentKey[];

export const defaultSiteContent: SiteContent = {
  siteConfig: { ...siteConfig },
  packages: packages.map((item) => ({ ...item, includes: [...item.includes] })),
  serviceAddOns: {
    equipment: [...serviceAddOns.equipment],
    instantCamera: { ...serviceAddOns.instantCamera },
  },
  servicePolicies: servicePolicies.map((item) => ({ ...item })),
  faqs: faqs.map((item) => ({ ...item })),
  processSteps: [...processSteps],
  whyCards: [
    {
      icon: "heart",
      title: "只拍女生和情侣",
      detail: "氛围轻松安全，拍摄全程由女摄影师引导，不需要担心水尬或不适。",
    },
    {
      icon: "camera",
      title: "第一次拍也没关系",
      detail: "会全程引导动作和情绪，不知道怎么摆姿势完全没问题。",
    },
    {
      icon: "message",
      title: "前期充分沟通",
      detail: "拍摄前沟通风格、服装、地点和参考图，确保拍出你想要的效果。",
    },
    {
      icon: "shield",
      title: "隐私保护",
      detail: "未经明确授权不会公开任何客片，可以放心拍摄。",
    },
  ],
  sectionCopy: {
    gallery: {
      eyebrow: "Gallery",
      title: "作品像一本慢慢翻开的相册",
      intro: "以下是不同风格的作品参考，点击可以查看大图。",
    },
    packages: {
      eyebrow: "Packages",
      title: "先了解适合你的拍摄方式",
      intro: "每种拍摄方式都包含风格沟通和全程引导，先看看哪种更适合你。",
    },
    details: {
      eyebrow: "Details",
      title: "设备、价格和预约规则写清楚",
      intro: "以下是拍摄设备、附加服务和预约须知，方便你在预约前了解清楚。",
    },
    notice: {
      eyebrow: "Process",
      title: "边界清晰，拍摄才会更放松",
      intro: "网站会把预约、隐私和授权规则放在用户能看见的位置，减少反复解释。",
    },
    why: {
      eyebrow: "Why",
      title: "为什么选择奶黄包摄影",
    },
    about: {
      eyebrow: "About",
      title: "奶黄包摄影",
      intro: "预约咨询",
      body: "南京个人摄影师，专注女生写真和情侣约拍。拍摄风格偏柔雾胶片感，适合日常记录、江南感写真和轻松陪拍。",
      bookingTitle: "想约一组温柔自然的照片？",
      profileLinkLabel: "查看小红书主页",
    },
    midCta: {
      eyebrow: "Next Step",
      title: "喜欢这种风格吗？",
      intro: "小红书私信聊聊你的想法，回复很快。不用急着确定，有什么问题都可以慢慢聊。",
      actionLabel: "小红书私信咨询",
    },
    footer: {
      tagline: "每一次快门，都是一次温柔照亮。",
    },
    safety: {
      title: "安全与边界说明",
      paragraphs: [
        "只接受女生或情侣约拍。尊重拍摄者隐私，未经明确授权不会公开客片。",
        "不接受让摄影师或客人不舒适的越界拍摄需求。",
      ],
    },
  },
};

export function isContentKey(key: string): key is ContentKey {
  return (contentKeys as readonly string[]).includes(key);
}

export function mergeSiteContent(content?: PartialSiteContent | null): SiteContent {
  if (!content || typeof content !== "object") {
    return cloneContent(defaultSiteContent);
  }

  return {
    siteConfig: {
      ...defaultSiteContent.siteConfig,
      ...pickStringRecord(content.siteConfig),
    },
    packages: isPackageList(content.packages) ? clonePackages(content.packages) : clonePackages(defaultSiteContent.packages),
    serviceAddOns: isServiceAddOns(content.serviceAddOns)
      ? cloneServiceAddOns(content.serviceAddOns)
      : cloneServiceAddOns(defaultSiteContent.serviceAddOns),
    servicePolicies: isPolicyList(content.servicePolicies)
      ? clonePolicies(content.servicePolicies)
      : clonePolicies(defaultSiteContent.servicePolicies),
    faqs: isFaqList(content.faqs) ? cloneFaqs(content.faqs) : cloneFaqs(defaultSiteContent.faqs),
    processSteps: isStringList(content.processSteps) ? [...content.processSteps] : [...defaultSiteContent.processSteps],
    whyCards: isWhyCardList(content.whyCards) ? cloneWhyCards(content.whyCards) : cloneWhyCards(defaultSiteContent.whyCards),
    sectionCopy: mergeSectionCopy(content.sectionCopy),
  };
}

export function validateContentPatch(
  key: string,
  value: unknown,
): { ok: true; value: SiteContent[ContentKey] } | { ok: false; error: string } {
  if (!isContentKey(key)) {
    return { ok: false, error: "Unsupported content section" };
  }

  switch (key) {
    case "siteConfig":
      if (!isSiteConfig(value)) return { ok: false, error: "Invalid site settings" };
      return { ok: true, value };
    case "packages":
      if (!isPackageList(value)) return { ok: false, error: "Invalid packages" };
      return { ok: true, value };
    case "serviceAddOns":
      if (!isServiceAddOns(value)) return { ok: false, error: "Invalid service add-ons" };
      return { ok: true, value };
    case "servicePolicies":
      if (!isPolicyList(value)) return { ok: false, error: "Invalid service policies" };
      return { ok: true, value };
    case "faqs":
      if (!isFaqList(value)) return { ok: false, error: "Invalid FAQs" };
      return { ok: true, value };
    case "processSteps":
      if (!isStringList(value)) return { ok: false, error: "Invalid process steps" };
      return { ok: true, value };
    case "whyCards":
      if (!isWhyCardList(value)) return { ok: false, error: "Invalid why cards" };
      return { ok: true, value };
    case "sectionCopy":
      if (!isSectionCopy(value)) return { ok: false, error: "Invalid section copy" };
      return { ok: true, value };
  }
}

function cloneContent(content: SiteContent): SiteContent {
  return {
    siteConfig: { ...content.siteConfig },
    packages: clonePackages(content.packages),
    serviceAddOns: cloneServiceAddOns(content.serviceAddOns),
    servicePolicies: clonePolicies(content.servicePolicies),
    faqs: cloneFaqs(content.faqs),
    processSteps: [...content.processSteps],
    whyCards: cloneWhyCards(content.whyCards),
    sectionCopy: {
      gallery: { ...content.sectionCopy.gallery },
      packages: { ...content.sectionCopy.packages },
      details: { ...content.sectionCopy.details },
      notice: { ...content.sectionCopy.notice },
      why: { ...content.sectionCopy.why },
      about: { ...content.sectionCopy.about },
      midCta: { ...content.sectionCopy.midCta },
      footer: { ...content.sectionCopy.footer },
      safety: {
        title: content.sectionCopy.safety.title,
        paragraphs: [...content.sectionCopy.safety.paragraphs],
      },
    },
  };
}

function clonePackages(items: PackageItem[]) {
  return items.map((item) => ({ ...item, includes: [...item.includes] }));
}

function clonePolicies(items: ServicePolicy[]) {
  return items.map((item) => ({ ...item }));
}

function cloneFaqs(items: FaqItem[]) {
  return items.map((item) => ({ ...item }));
}

function cloneWhyCards(items: WhyCard[]) {
  return items.map((item) => ({ ...item }));
}

function cloneServiceAddOns(value: ServiceAddOns): ServiceAddOns {
  return {
    equipment: [...value.equipment],
    instantCamera: { ...value.instantCamera },
  };
}

function mergeSectionCopy(value: unknown): SectionCopy {
  if (!value || typeof value !== "object") return cloneContent(defaultSiteContent).sectionCopy;
  const input = value as Partial<SectionCopy>;
  return {
    gallery: { ...defaultSiteContent.sectionCopy.gallery, ...pickStringRecord(input.gallery) },
    packages: { ...defaultSiteContent.sectionCopy.packages, ...pickStringRecord(input.packages) },
    details: { ...defaultSiteContent.sectionCopy.details, ...pickStringRecord(input.details) },
    notice: { ...defaultSiteContent.sectionCopy.notice, ...pickStringRecord(input.notice) },
    why: { ...defaultSiteContent.sectionCopy.why, ...pickStringRecord(input.why) },
    about: { ...defaultSiteContent.sectionCopy.about, ...pickStringRecord(input.about) },
    midCta: { ...defaultSiteContent.sectionCopy.midCta, ...pickStringRecord(input.midCta) },
    footer: { ...defaultSiteContent.sectionCopy.footer, ...pickStringRecord(input.footer) },
    safety: {
      title: isRecord(input.safety) && isNonEmptyString(input.safety.title)
        ? input.safety.title
        : defaultSiteContent.sectionCopy.safety.title,
      paragraphs: isRecord(input.safety) && isStringList(input.safety.paragraphs)
        ? input.safety.paragraphs
        : [...defaultSiteContent.sectionCopy.safety.paragraphs],
    },
  };
}

function isSiteConfig(value: unknown): value is SiteConfigContent {
  return isRecord(value)
    && isNonEmptyString(value.brandName)
    && isNonEmptyString(value.city)
    && isNonEmptyString(value.domain)
    && isNonEmptyString(value.tagline)
    && isNonEmptyString(value.description)
    && isNonEmptyString(value.contactStatus)
    && isNonEmptyString(value.contactHint)
    && isNonEmptyString(value.xiaohongshuProfile);
}

function isPackageList(value: unknown): value is PackageItem[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every((item) => isRecord(item)
      && isNonEmptyString(item.name)
      && isNonEmptyString(item.price)
      && isNonEmptyString(item.duration)
      && isNonEmptyString(item.summary)
      && isStringList(item.includes));
}

function isServiceAddOns(value: unknown): value is ServiceAddOns {
  return isRecord(value)
    && isStringList(value.equipment)
    && isRecord(value.instantCamera)
    && isNonEmptyString(value.instantCamera.camera)
    && isNonEmptyString(value.instantCamera.price);
}

function isPolicyList(value: unknown): value is ServicePolicy[] {
  return Array.isArray(value)
    && value.every((item) => isRecord(item)
      && isNonEmptyString(item.title)
      && isNonEmptyString(item.detail));
}

function isFaqList(value: unknown): value is FaqItem[] {
  return Array.isArray(value)
    && value.every((item) => isRecord(item)
      && isNonEmptyString(item.question)
      && isNonEmptyString(item.answer));
}

function isWhyCardList(value: unknown): value is WhyCard[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every((item) => isRecord(item)
      && (item.icon === "heart" || item.icon === "camera" || item.icon === "message" || item.icon === "shield")
      && isNonEmptyString(item.title)
      && isNonEmptyString(item.detail));
}

function isSectionCopy(value: unknown): value is SectionCopy {
  if (!isRecord(value)) return false;
  const sectionKeys = ["gallery", "packages", "details", "notice", "why"] as const;
  const baseSectionsValid = sectionKeys.every((key) => isRecord(value[key])
    && isNonEmptyString(value[key].eyebrow)
    && isNonEmptyString(value[key].title)
    && (value[key].intro === undefined || typeof value[key].intro === "string"));

  return baseSectionsValid
    && isRecord(value.about)
    && isNonEmptyString(value.about.eyebrow)
    && isNonEmptyString(value.about.title)
    && isNonEmptyString(value.about.body)
    && isNonEmptyString(value.about.bookingTitle)
    && isNonEmptyString(value.about.profileLinkLabel)
    && isRecord(value.midCta)
    && isNonEmptyString(value.midCta.eyebrow)
    && isNonEmptyString(value.midCta.title)
    && isNonEmptyString(value.midCta.intro)
    && isNonEmptyString(value.midCta.actionLabel)
    && isRecord(value.footer)
    && isNonEmptyString(value.footer.tagline)
    && isRecord(value.safety)
    && isNonEmptyString(value.safety.title)
    && isStringList(value.safety.paragraphs);
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isNonEmptyString(item));
}

function pickStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const output: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") {
      output[key] = item;
    }
  }
  return output;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
