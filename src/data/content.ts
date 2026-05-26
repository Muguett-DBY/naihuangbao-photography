import { defaultSiteContent as zhCN } from "./contents/zh-CN";
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

export { zhCN as defaultSiteContent };

export function isContentKey(key: string): key is ContentKey {
  return (contentKeys as readonly string[]).includes(key);
}

export function mergeSiteContent(content?: PartialSiteContent | null, defaults: SiteContent = zhCN): SiteContent {
  if (!content || typeof content !== "object") {
    return cloneContent(defaults);
  }

  return {
    siteConfig: {
      ...defaults.siteConfig,
      ...pickStringRecord(content.siteConfig),
    },
    packages: isPackageList(content.packages) ? clonePackages(content.packages) : clonePackages(defaults.packages),
    serviceAddOns: isServiceAddOns(content.serviceAddOns)
      ? cloneServiceAddOns(content.serviceAddOns)
      : cloneServiceAddOns(defaults.serviceAddOns),
    servicePolicies: isPolicyList(content.servicePolicies)
      ? clonePolicies(content.servicePolicies)
      : clonePolicies(defaults.servicePolicies),
    faqs: isFaqList(content.faqs) ? cloneFaqs(content.faqs) : cloneFaqs(defaults.faqs),
    processSteps: isStringList(content.processSteps) ? [...content.processSteps] : [...defaults.processSteps],
    whyCards: isWhyCardList(content.whyCards) ? cloneWhyCards(content.whyCards) : cloneWhyCards(defaults.whyCards),
    sectionCopy: mergeSectionCopy(content.sectionCopy, defaults),
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

export function cloneContent(content: SiteContent): SiteContent {
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

function mergeSectionCopy(value: unknown, defaults: SiteContent): SectionCopy {
  if (!value || typeof value !== "object") return cloneContent(defaults).sectionCopy;
  const input = value as Partial<SectionCopy>;
  return {
    gallery: { ...defaults.sectionCopy.gallery, ...pickStringRecord(input.gallery) },
    packages: { ...defaults.sectionCopy.packages, ...pickStringRecord(input.packages) },
    details: { ...defaults.sectionCopy.details, ...pickStringRecord(input.details) },
    notice: { ...defaults.sectionCopy.notice, ...pickStringRecord(input.notice) },
    why: { ...defaults.sectionCopy.why, ...pickStringRecord(input.why) },
    about: { ...defaults.sectionCopy.about, ...pickStringRecord(input.about) },
    midCta: { ...defaults.sectionCopy.midCta, ...pickStringRecord(input.midCta) },
    footer: { ...defaults.sectionCopy.footer, ...pickStringRecord(input.footer) },
    safety: {
      title: isRecord(input.safety) && isNonEmptyString(input.safety.title)
        ? input.safety.title
        : defaults.sectionCopy.safety.title,
      paragraphs: isRecord(input.safety) && isStringList(input.safety.paragraphs)
        ? input.safety.paragraphs
        : [...defaults.sectionCopy.safety.paragraphs],
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
