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

// ── New business line types ──

export type Course = {
  id: string;
  title: string;
  title_en?: string;
  title_ko?: string;
  title_ja?: string;
  description?: string;
  description_en?: string;
  description_ko?: string;
  description_ja?: string;
  cover_image_url?: string;
  video_url?: string;
  content_markdown?: string;
  category: string;
  difficulty: string;
  duration_minutes?: number;
  sort_order: number;
  published: number;
  created_at: string;
  updated_at: string;
};

export type CourseModule = {
  id: string;
  course_id: string;
  title: string;
  title_en?: string;
  title_ko?: string;
  title_ja?: string;
  type: "video" | "text" | "gallery";
  content?: string;
  sort_order: number;
};

export type Preset = {
  id: string;
  name: string;
  name_en?: string;
  name_ko?: string;
  name_ja?: string;
  description?: string;
  description_en?: string;
  description_ko?: string;
  description_ja?: string;
  category: string;
  preview_images: string[];
  download_url?: string;
  price_display?: string;
  featured: number;
  download_count: number;
  created_at: string;
  updated_at: string;
};

export type Workshop = {
  id: string;
  title: string;
  title_en?: string;
  title_ko?: string;
  title_ja?: string;
  description?: string;
  description_en?: string;
  description_ko?: string;
  description_ja?: string;
  cover_image_url?: string;
  event_date: string;
  event_time?: string;
  location?: string;
  max_participants?: number;
  current_participants: number;
  price_display?: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  registration_form_url?: string;
  created_at: string;
  updated_at: string;
};

export type WorkshopRegistration = {
  id: string;
  workshop_id: string;
  name: string;
  contact: string;
  participants: number;
  notes?: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
};

export type Merchandise = {
  id: string;
  name: string;
  name_en?: string;
  name_ko?: string;
  name_ja?: string;
  description?: string;
  description_en?: string;
  description_ko?: string;
  description_ja?: string;
  images: string[];
  category: string;
  price_display?: string;
  available: number;
  created_at: string;
  updated_at: string;
};
