import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import {
  tCourseCategory,
  tCourseDifficulty,
  tMerchandiseCategory,
  tPresetCategory,
  tWorkshopStatus,
} from "./i18n-typed";

const missingKeyTranslator = ((key: string, options?: { defaultValue?: string }) => (
  options?.defaultValue ?? key
)) as unknown as TFunction;

describe("typed translation fallbacks", () => {
  it("shows unknown API values instead of leaking translation keys", () => {
    expect(tCourseCategory(missingKeyTranslator, "editorial")).toBe("editorial");
    expect(tCourseDifficulty(missingKeyTranslator, "masterclass")).toBe("masterclass");
    expect(tPresetCategory(missingKeyTranslator, "mobile")).toBe("mobile");
    expect(tMerchandiseCategory(missingKeyTranslator, "zine")).toBe("zine");
    expect(tWorkshopStatus(missingKeyTranslator, "waitlisted")).toBe("waitlisted");
  });
});
