import { describe, expect, it } from "vitest";
import { createPendingBookingRequestInit, getPendingBookingSyncDisposition, type PendingBooking } from "./offlineBooking";

const booking: PendingBooking = {
  id: "local-booking-1",
  packageName: "Portrait",
  preferredDate: "2099-08-20",
  preferredTime: "morning",
  name: "Offline Guest",
  contact: "offline@example.com",
  notes: "Saved while offline",
  createdAt: "2099-08-19T10:00:00.000Z",
  status: "pending",
};

describe("offline booking sync", () => {
  it("replays pending bookings with the same public mutation boundary as online booking", () => {
    const init = createPendingBookingRequestInit(booking);
    const headers = init.headers as Record<string, string>;

    expect(init.method).toBe("POST");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["x-nhb-public-action"]).toBe("1");
    expect(JSON.parse(init.body as string)).toMatchObject({
      packageName: booking.packageName,
      preferredDate: booking.preferredDate,
      preferredTime: booking.preferredTime,
      name: booking.name,
      contact: booking.contact,
      notes: booking.notes,
    });
  });

  it("classifies offline replay failures so permanent client errors stop retrying", () => {
    expect(getPendingBookingSyncDisposition(201)).toBe("synced");
    expect(getPendingBookingSyncDisposition(409)).toBe("failed");
    expect(getPendingBookingSyncDisposition(429)).toBe("failed");
    expect(getPendingBookingSyncDisposition(503)).toBe("retry");
  });
});
