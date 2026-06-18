import { jsonResponse, badRequest, unauthorized, unavailable } from "../../../../_responses";
import { getUserFromRequest } from "../../../../_auth";
import { getRequiredAuthSecret } from "../../../../_security";
import { validateId, validateString, validateBody } from "../../../../_validation";

type AuthEnv = Env & { AUTH_SECRET?: string };

type BookingRow = {
  id: string;
  contact: string;
  status: string;
};

type UserRow = {
  id: string;
  email: string;
};

export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  const secret = getRequiredAuthSecret(context.env);
  if (!secret) return unauthorized("请先登录");

  const user = await getUserFromRequest(context.request, secret);
  if (!user) return unauthorized("请先登录");

  if (!context.env.DB) {
    return jsonResponse({ error: "数据库未配置" }, 503);
  }

  const bookingId = (context.params as Record<string, string>).id;
  const idCheck = validateId(bookingId, "预约 ID");
  if (!idCheck.valid) return badRequest(idCheck.error);

  const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;
  const validated = validateBody(body, {
    preferred_date: (v) => validateString(v, "新的预约日期"),
  });
  if (!validated.valid) return badRequest(validated.error);

  const newDate = String(body.preferred_date).trim();

  try {
    // Verify the booking belongs to this user (via email match)
    const userRow = await context.env.DB.prepare(
      `select id, email from users where id = ?`,
    ).bind(user.userId).first<UserRow>();

    if (!userRow) return unauthorized("用户不存在");

    const booking = await context.env.DB.prepare(
      `select id, contact, status from booking_requests where id = ?`,
    ).bind(bookingId).first<BookingRow>();

    if (!booking) {
      return jsonResponse({ error: "预约不存在" }, 404);
    }

    if (booking.contact !== userRow.email) {
      return jsonResponse({ error: "无权操作此预约" }, 403);
    }

    if (booking.status === "done" || booking.status === "canceled") {
      return badRequest("该预约无法改期");
    }

    await context.env.DB.prepare(
      `update booking_requests set preferred_date = ? where id = ?`,
    ).bind(newDate, bookingId).run();

    return jsonResponse({ ok: true });
  } catch (error) {
    return unavailable("改期失败", error, { route: `/api/user/bookings/${bookingId}/reschedule`, method: "POST" });
  }
};
