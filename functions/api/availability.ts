import { badRequest, jsonResponse, unavailable } from "../_responses";

type BookingRow = {
  preferred_date: string;
  preferred_time: string;
};

type DateInfo = {
  status: "available" | "booked" | "partial";
  count: number;
};

const MAX_SLOTS_PER_DAY = 3;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return jsonResponse({ dates: {} });
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
         and status != 'cancelled'`,
    )
      .bind(startDate, endDate)
      .all<BookingRow>();

    const dates: Record<string, DateInfo> = {};

    for (const row of results) {
      if (!row.preferred_date) continue;
      const dateKey = row.preferred_date.slice(0, 10);

      if (!dates[dateKey]) {
        dates[dateKey] = { status: "available", count: 0 };
      }
      dates[dateKey].count++;

      if (dates[dateKey].count >= MAX_SLOTS_PER_DAY) {
        dates[dateKey].status = "booked";
      } else {
        dates[dateKey].status = "partial";
      }
    }

    return jsonResponse({ dates });
  } catch (error) {
    return unavailable("查询可用日期失败", error, { route: "/api/availability" });
  }
};
