import { jsonResponse, unauthorized, unavailable } from "../../_responses";
import { getUserFromRequest } from "../../_auth";
import { getRequiredAuthSecret } from "../../_security";

type AuthEnv = Env & { AUTH_SECRET?: string };

type BookingRow = {
  id: string;
  package_name: string;
  preferred_date: string;
  preferred_time: string;
  name: string;
  contact: string;
  notes: string;
  status: string;
  created_at: string;
};

export const onRequestGet: PagesFunction<AuthEnv> = async (context) => {
  const secret = getRequiredAuthSecret(context.env);
  if (!secret) return unauthorized("请先登录");

  const user = await getUserFromRequest(context.request, secret);
  if (!user) return unauthorized("请先登录");

  if (!context.env.DB) {
    return jsonResponse({ bookings: [] }, 503);
  }

  try {
    const result = await context.env.DB.prepare(
      `select id, package_name, preferred_date, preferred_time, name, contact, notes, status, created_at
       from booking_requests
       where contact = (select email from users where id = ?)
       order by created_at desc`,
    )
      .bind(user.userId)
      .all<BookingRow>();

    return jsonResponse({ bookings: result.results });
  } catch (error) {
    return unavailable("加载预约失败", error, { route: "/api/user/bookings", method: "GET" });
  }
};
