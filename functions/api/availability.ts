import { badRequest, jsonResponse, unavailable } from "../_responses";
import { BOOKING_CAPACITY_PER_DAY, getBookingTimeSlotAvailability, isBookingDateFull, type BookingTimeSlotInfo } from "../_booking";

type BookingRow = {
  preferred_date: string;
  preferred_time: string;
};

type DateInfo = {
  status: "available" | "booked" | "partial";
  count: number;
  capacity: number;
  remaining: number;
  timeSlots: Record<"morning" | "afternoon" | "fullDay", BookingTimeSlotInfo>;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return jsonResponse({ dates: {}, capacityPerDay: BOOKING_CAPACITY_PER_DAY });
  }

  const url = new URL(context.request.url);
  const month = url.searchParams.get("month");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return badRequest("month 参数格式应为 YYYY-MM");
  }

  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const m = Number(monthStr);
  const startDate = `${month}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  try {
    const { results } = await context.env.DB.prepare(
      `select preferred_date, preferred_time
       from booking_requests
       where preferred_date >= ? and preferred_date <= ?
         and status not in ('cancelled', 'canceled')`,
    )
      .bind(startDate, endDate)
      .all<BookingRow>();

    const rowsByDate: Record<string, BookingRow[]> = {};

    for (const row of results) {
      if (!row.preferred_date) continue;
      const dateKey = row.preferred_date.slice(0, 10);
      rowsByDate[dateKey] = [...(rowsByDate[dateKey] ?? []), row];
    }

    const dates: Record<string, DateInfo> = {};

    for (const [dateKey, rows] of Object.entries(rowsByDate)) {
      const count = rows.length;
      const dateFull = isBookingDateFull(count);

      dates[dateKey] = {
        status: dateFull ? "booked" : "partial",
        count,
        capacity: BOOKING_CAPACITY_PER_DAY,
        remaining: Math.max(BOOKING_CAPACITY_PER_DAY - count, 0),
        timeSlots: getBookingTimeSlotAvailability(rows, dateFull),
      };
    }

    return jsonResponse({ dates, capacityPerDay: BOOKING_CAPACITY_PER_DAY });
  } catch (error) {
    return unavailable("查询可用日期失败", error, { route: "/api/availability" });
  }
};
