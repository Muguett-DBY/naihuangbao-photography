import { describe, expect, it } from "vitest";
import { galleryItems } from "../data/gallery";
import { faqs } from "../data/faq";
import { packages, serviceAddOns, servicePolicies } from "../data/packages";

describe("published photography service content", () => {
  it("publishes the current hourly prices and booking rules from the service sheet", () => {
    expect(packages.map((item) => item.price)).toContain("50/h");
    expect(packages.map((item) => item.price)).toContain("60/h");
    expect(servicePolicies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "2小时起拍" }),
        expect.objectContaining({ title: "定金50" }),
        expect.objectContaining({ title: "熟人/回头客 -15" }),
      ]),
    );
  });

  it("publishes the instant camera add-on and camera equipment notes", () => {
    expect(serviceAddOns.instantCamera).toMatchObject({
      camera: "富士 mini 11",
      price: "9.9/张",
    });
    expect(serviceAddOns.equipment).toEqual(
      expect.arrayContaining(["佳能200d二代", "佳能95ixus", "iPhone 17 Pro", "iPhone 6 SP"]),
    );
  });

  it("keeps travel, timing, reschedule and privacy rules visible in FAQ content", () => {
    const faqText = faqs.map((item) => `${item.question} ${item.answer}`).join("\n");
    expect(faqText).toContain("报销来回路费");
    expect(faqText).toContain("迟到15分钟开始计时");
    expect(faqText).toContain("当天不可更改拍摄时间");
    expect(faqText).toContain("非恶劣天气不退定金，可改日期");
    expect(faqText).toContain("不接男生，情侣拍可男生出镜");
    expect(faqText).toContain("未经明确授权不会公开客片");
  });

  it("uses local cropped client photos for the curated gallery", () => {
    const localPhotos = galleryItems.filter((photo) => photo.imageUrl.startsWith("/images/gallery/"));
    expect(localPhotos).toHaveLength(6);
    expect(localPhotos.every((photo) => photo.imageUrl.endsWith(".webp"))).toBe(true);
  });
});
