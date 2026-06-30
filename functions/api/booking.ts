import { badRequest, jsonResponse, unavailable } from "../_responses";
import { enforceRateLimit, rateLimited, requirePublicMutationRequest } from "../_security";
import { validateString, validateOptionalString } from "../_validation";
import {
  BOOKING_CAPACITY_PER_DAY,
  getBookingTimeSlotAvailability,
  getBookingTimeSlotRecovery,
  getBusinessDate,
  isBookingDateFull,
  isBookingTimeUnavailable,
  validateBookingDate,
  validateBookingTimeSlot,
} from "../_booking";

type BookingBody = {
  packageName?: string;
  preferredDate?: string;
  preferredTime?: string;
  name?: string;
  contact?: string;
  notes?: string;
};

const RECENT_BOOKING_WINDOW_MS = 5 * 60 * 1000;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  const limit = await enforceRateLimit(context.request, context.env, "booking-submit", 6, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter, 6);

  if (!context.env.DB) {
    return jsonResponse({ error: "预约功能暂时不可用" }, 503);
  }

  const body = (await context.request.json().catch(() => ({}))) as BookingBody;

  // Validate inputs
  const nameResult = validateString(body.name, "姓名", 50);
  if (!nameResult.valid) return badRequest(nameResult.error);

  const contactResult = validateString(body.contact, "联系方式", 100);
  if (!contactResult.valid) return badRequest(contactResult.error);

  const notesResult = validateOptionalString(body.notes, "备注", 500);
  if (!notesResult.valid) return badRequest(notesResult.error);

  if (body.preferredDate) {
    const dateResult = validateBookingDate(body.preferredDate, getBusinessDate());
    if (!dateResult.valid) return badRequest(dateResult.error);
  }

  const timeResult = validateBookingTimeSlot(body.preferredTime);
  if (!timeResult.valid) return badRequest(timeResult.error);

  const name = body.name!.trim();
  const contact = body.contact!.trim();
  const notes = body.notes?.trim() ?? "";
  const preferredDate = body.preferredDate?.trim() ?? "";
  const preferredTime = body.preferredTime?.trim() ?? "";
  const packageName = body.packageName?.trim() ?? "";

  try {
    if (preferredDate) {
      const conflict = await context.env.DB.prepare(
        `select id, name, contact, status, created_at from booking_requests
         where preferred_date = ? and preferred_time = ? and status not in ('cancelled', 'canceled') and contact = ?
         order by created_at desc limit 1`,
      )
        .bind(preferredDate, preferredTime, contact)
        .first<{ id: string; name: string; contact: string; status: string; created_at: string }>();

      if (conflict) {
        return jsonResponse({
          error: "duplicate_booking",
          message: "您已在此时间段提交过预约，请勿重复提交。",
          existingId: conflict.id,
          existingStatus: conflict.status,
        }, 409);
      }
    }

    const recentWindow = new Date(Date.now() - RECENT_BOOKING_WINDOW_MS).toISOString();
    const recent = await context.env.DB.prepare(
      `select id, status, created_at from booking_requests
       where contact = ? and created_at >= ? and (status = 'pending' or status = 'contacted')
       order by created_at desc limit 1`,
    )
      .bind(contact, recentWindow)
      .first<{ id: string; status: string; created_at: string }>();

    if (recent) {
      return jsonResponse({
        error: "recent_booking",
        message: "您最近已提交过预约，请稍后再试或联系客服。",
        existingId: recent.id,
        existingStatus: recent.status,
      }, 429);
    }

    if (preferredDate) {
      const { results: activeBookingsForDate } = await context.env.DB.prepare(
        `select preferred_time from booking_requests
         where preferred_date = ?
           and status not in ('cancelled', 'canceled')`,
      )
        .bind(preferredDate)
        .all<{ preferred_time: string }>();
      const activeBookings = activeBookingsForDate.length;
      const dateFull = isBookingDateFull(activeBookings);

      if (dateFull) {
        return jsonResponse({
          error: "fully_booked",
          message: "该日期已约满，请加入候补名单。",
          waitlist: {
            recommended: true,
            preferredDate,
            capacityPerDay: BOOKING_CAPACITY_PER_DAY,
            activeBookings,
          },
        }, 409);
      }

      if (isBookingTimeUnavailable(activeBookingsForDate, preferredTime, dateFull)) {
        const timeSlots = getBookingTimeSlotAvailability(activeBookingsForDate, dateFull);
        return jsonResponse({
          error: "time_unavailable",
          message: "该时段已不可预约，请选择其他时段。",
          preferredDate,
          preferredTime,
          timeSlots,
          recovery: getBookingTimeSlotRecovery(timeSlots, preferredTime),
        }, 409);
      }
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await context.env.DB.prepare(
      `insert into booking_requests (id, package_name, preferred_date, preferred_time, name, contact, notes, status, created_at)
       values (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
      .bind(
        id,
        packageName,
        preferredDate,
        preferredTime,
        name,
        contact,
        notes,
        createdAt,
      )
      .run();

    return jsonResponse({ ok: true, id }, 201);
  } catch (error) {
    return unavailable("提交失败，请稍后重试。", error, { route: "/api/booking", method: "POST" });
  }
};
