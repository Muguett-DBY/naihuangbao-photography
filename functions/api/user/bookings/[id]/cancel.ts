import { jsonResponse, badRequest, unauthorized, unavailable } from "../../../../_responses";
import { getUserFromRequest } from "../../../../_auth";
import { getRequiredAuthSecret } from "../../../../_security";
import { validateId } from "../../../../_validation";
import { isCancelledBookingStatus } from "../../../../_booking";

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

    if (booking.status === "done") {
      return badRequest("已完成的预约无法取消");
    }

    if (isCancelledBookingStatus(booking.status)) {
      return badRequest("该预约已取消");
    }

    await context.env.DB.prepare(
      `update booking_requests set status = 'cancelled' where id = ?`,
    ).bind(bookingId).run();

    return jsonResponse({ ok: true });
  } catch (error) {
    return unavailable("取消失败", error, { route: `/api/user/bookings/${bookingId}/cancel`, method: "POST" });
  }
};
