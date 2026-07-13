import { jsonResponse, unauthorized, unavailable } from "../../_responses";
import { getUserFromRequest } from "../../_auth";
import { getRequiredAuthSecret } from "../../_security";

type AuthEnv = Env & { AUTH_SECRET?: string };

export const onRequestGet: PagesFunction<AuthEnv> = async (context) => {
  const secret = getRequiredAuthSecret(context.env);
  if (!secret) return unauthorized("请先登录");

  const user = await getUserFromRequest(context.request, secret);
  if (!user) return unauthorized("请先登录");

  if (!context.env.DB) {
    return jsonResponse({ error: "服务不可用" }, 503);
  }

  try {
    const userId = user.userId;
    const [bookingRow, courseRow, workshopRow] = await Promise.all([
      context.env.DB.prepare(
        `select
          count(*) as total,
          sum(case when status in ('pending','confirmed') then 1 else 0 end) as upcoming
        from booking_requests where user_id = ?`
      ).bind(userId).first<{ total: number; upcoming: number }>(),

      context.env.DB.prepare(
        `select count(*) as total from course_purchases where user_id = ?`
      ).bind(userId).first<{ total: number }>(),

      context.env.DB.prepare(
        `select count(*) as total from workshop_registrations where user_id = ?`
      ).bind(userId).first<{ total: number }>(),
    ]);

    return jsonResponse({
      bookings: {
        total: bookingRow?.total ?? 0,
        upcoming: bookingRow?.upcoming ?? 0,
      },
      courses: { total: courseRow?.total ?? 0 },
      workshops: { total: workshopRow?.total ?? 0 },
    }, 200);
  } catch (error) {
    return unavailable("获取统计数据失败", error, { route: "/api/user/stats" });
  }
};
