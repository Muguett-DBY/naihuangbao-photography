import { describe, expect, it } from "vitest";
import {
  defaultSiteContent,
  isContentKey,
  mergeSiteContent,
  validateContentPatch,
} from "../data/content";

describe("site content defaults and validation", () => {
  it("keeps the built-in CMS defaults readable for Chinese site copy", () => {
    expect(defaultSiteContent.siteConfig.brandName).toBe("奶黄包摄影");
    expect(defaultSiteContent.packages.map((item) => item.name)).toEqual([
      "室内写真",
      "室外约拍",
      "拍立得加拍",
    ]);
    expect(defaultSiteContent.faqs[0]?.question).toBe("可以拍哪些类型？");
  });

  it("merges CMS content over defaults while keeping missing sections usable", () => {
    const merged = mergeSiteContent({
      siteConfig: {
        brandName: "New Studio",
        contactStatus: "DM us",
      },
      packages: [
        {
          name: "Portrait Session",
          price: "88/h",
          duration: "2 hours",
          summary: "Updated package",
          includes: ["Planning", "Shooting"],
        },
      ],
    });

    expect(merged.siteConfig.brandName).toBe("New Studio");
    expect(merged.siteConfig.contactStatus).toBe("DM us");
    expect(merged.siteConfig.city).toBe(defaultSiteContent.siteConfig.city);
    expect(merged.packages).toHaveLength(1);
    expect(merged.servicePolicies).toEqual(defaultSiteContent.servicePolicies);
  });

  it("accepts only whitelisted CMS sections with valid structured data", () => {
    expect(isContentKey("packages")).toBe(true);
    expect(isContentKey("unknown")).toBe(false);

    const valid = validateContentPatch("faqs", [
      { question: "How?", answer: "Like this." },
    ]);
    expect(valid.ok).toBe(true);

    const invalidKey = validateContentPatch("unknown", {});
    expect(invalidKey.ok).toBe(false);

    const invalidPackage = validateContentPatch("packages", [
      { name: "Missing fields" },
    ]);
    expect(invalidPackage.ok).toBe(false);
  });
});
