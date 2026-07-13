import { describe, expect, it } from "vitest";
import { getWorkshopAvailability } from "./useWorkshopRegistration";

describe("getWorkshopAvailability", () => {
  it("reads capacity from the nested public workshop detail response", () => {
    expect(getWorkshopAvailability({
      workshop: { max_participants: 8, current_participants: 8 },
    })).toEqual({ available: false, spotsLeft: 0 });
  });

  it("keeps compatibility with flat payloads and unlimited workshops", () => {
    expect(getWorkshopAvailability({ max_participants: 6, current_participants: 2 }))
      .toEqual({ available: true, spotsLeft: 4 });
    expect(getWorkshopAvailability({ workshop: { max_participants: 0, current_participants: 12 } }))
      .toEqual({ available: true, spotsLeft: null });
  });

  it("fails closed for malformed capacity instead of treating it as unlimited", () => {
    expect(getWorkshopAvailability({ max_participants: -1, current_participants: 0 }))
      .toEqual({ available: false, spotsLeft: 0 });
  });

  it("closes registration for workshops that are not upcoming", () => {
    expect(getWorkshopAvailability({
      workshop: { max_participants: 8, current_participants: 2, status: "ongoing" },
    })).toEqual({ available: false, spotsLeft: 6 });
    expect(getWorkshopAvailability({
      workshop: { max_participants: 0, current_participants: 2, status: "cancelled" },
    })).toEqual({ available: false, spotsLeft: null });
  });
});
