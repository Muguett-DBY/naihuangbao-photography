import { jsonResponse, badRequest, unauthorized, unavailable } from "../../../../_responses";
import { getUserFromRequest } from "../../../../_auth";
import { getRequiredAuthSecret, requirePublicMutationRequest } from "../../../../_security";
import { validateId } from "../../../../_validation";
import {
  getBookingTimeSlotAvailability,
  getBookingTimeSlotRecovery,
  getBusinessDate,
  isBookingDateFull,
  isCancelledBookingStatus,
  isBookingTimeUnavailable,
  validateBookingDate,
  validateBookingTimeSlot,
} from "../../../../_booking";

type AuthEnv = Env & { AUTH_SECRET?: string };

type BookingRow = {
  id: string;
  user_id: string | null;
  status: string;
  preferred_date: string;
  preferred_time: string;
};

export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

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
  const dateCheck = validateBookingDate(body.preferred_date, getBusinessDate());
  if (!dateCheck.valid) return badRequest(dateCheck.error);
  const timeCheck = validateBookingTimeSlot(body.preferred_time);
  if (!timeCheck.valid) return badRequest(timeCheck.error);
  const newDate = String(body.preferred_date);

  try {
    const booking = await context.env.DB.prepare(
      `select id, user_id, status, preferred_date, preferred_time from booking_requests where id = ?`,
    ).bind(bookingId).first<BookingRow>();

    if (!booking) {
      return jsonResponse({ error: "预约不存在" }, 404);
    }

    if (booking.user_id !== user.userId) {
      return jsonResponse({ error: "无权操作此预约" }, 403);
    }

    if (booking.status === "done" || isCancelledBookingStatus(booking.status)) {
      return badRequest("该预约无法改期");
    }

    const newTime = body.preferred_time === undefined
      ? booking.preferred_time
      : body.preferred_time == null ? "" : String(body.preferred_time).trim();

    if (newDate === booking.preferred_date && newTime === booking.preferred_time) {
      return badRequest("请选择不同的日期或时段");
    }

    const { results: activeBookingsForDate } = await context.env.DB.prepare(
      `select preferred_time
       from booking_requests
       where preferred_date = ?
         and id != ?
         and status not in ('cancelled', 'canceled')`,
    ).bind(newDate, bookingId).all<{ preferred_time: string }>();
    const dateFull = isBookingDateFull(activeBookingsForDate.length);

    if (dateFull) {
      return jsonResponse({ error: "该日期已约满，请选择其他日期" }, 409);
    }

    if (isBookingTimeUnavailable(activeBookingsForDate, newTime, dateFull)) {
      const timeSlots = getBookingTimeSlotAvailability(activeBookingsForDate, dateFull);
      return jsonResponse({
        error: "time_unavailable",
        message: "该时段已不可预约，请选择其他时段。",
        preferredDate: newDate,
        preferredTime: newTime,
        timeSlots,
        recovery: getBookingTimeSlotRecovery(timeSlots, newTime),
      }, 409);
    }

    await context.env.DB.prepare(
      `update booking_requests set preferred_date = ?, preferred_time = ? where id = ?`,
    ).bind(newDate, newTime, bookingId).run();

    return jsonResponse({
      ok: true,
      booking: { preferred_date: newDate, preferred_time: newTime },
    });
  } catch (error) {
    return unavailable("改期失败", error, { route: `/api/user/bookings/${bookingId}/reschedule`, method: "POST" });
  }
};
