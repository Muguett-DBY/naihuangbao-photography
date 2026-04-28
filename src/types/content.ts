export type PackageItem = {
  name: string;
  price: string;
  duration: string;
  summary: string;
  includes: string[];
};

export type ServicePolicy = {
  title: string;
  detail: string;
};

export type ServiceAddOns = {
  equipment: string[];
  instantCamera: {
    camera: string;
    price: string;
  };
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type WhyCardIcon = "heart" | "camera" | "message" | "shield";

export type WhyCard = {
  icon: WhyCardIcon;
  title: string;
  detail: string;
};

export type SectionText = {
  eyebrow: string;
  title: string;
  intro?: string;
};

export type SectionCopy = {
  gallery: SectionText;
  packages: SectionText;
  details: SectionText;
  notice: SectionText;
  why: SectionText;
  about: SectionText & {
    body: string;
    bookingTitle: string;
    profileLinkLabel: string;
  };
  midCta: {
    eyebrow: string;
    title: string;
    intro: string;
    actionLabel: string;
  };
  footer: {
    tagline: string;
  };
  safety: {
    title: string;
    paragraphs: string[];
  };
};

export type SiteConfigContent = {
  brandName: string;
  city: string;
  domain: string;
  tagline: string;
  description: string;
  contactStatus: string;
  contactHint: string;
  xiaohongshuProfile: string;
};

export type SiteContent = {
  siteConfig: SiteConfigContent;
  packages: PackageItem[];
  serviceAddOns: ServiceAddOns;
  servicePolicies: ServicePolicy[];
  faqs: FaqItem[];
  processSteps: string[];
  whyCards: WhyCard[];
  sectionCopy: SectionCopy;
};

export type ContentKey = keyof SiteContent;
export type PartialSiteContent = Partial<{
  [Key in ContentKey]: Partial<SiteContent[Key]> | SiteContent[Key];
}>;
