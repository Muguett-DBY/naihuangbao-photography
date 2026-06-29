import { badRequest, jsonResponse, unavailable } from "../../_responses";
import { enforceRateLimit, rateLimited, requirePublicMutationRequest } from "../../_security";
import { validateString } from "../../_validation";
import { BOOKING_CAPACITY_PER_DAY, getBusinessDate, isBookingDateFull, validateBookingDate } from "../../_booking";

type WaitlistBody = {
  preferredDate?: string;
  contact?: string;
  name?: string;
  packageName?: string;
};

type ExistingWaitlistRow = {
  id: string;
  preferred_date: string;
  active: number;
  created_at: string;
};

const MAX_WAITLIST_PER_DAY = 50;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  const limit = await enforceRateLimit(context.request, context.env, "booking-waitlist", 20, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  const body = (await context.request.json().catch(() => ({}))) as WaitlistBody;

  const contactResult = validateString(body.contact, "联系方式", 100);
  if (!contactResult.valid) return badRequest(contactResult.error);

  const nameResult = validateString(body.name, "姓名", 50);
  if (!nameResult.valid) return badRequest(nameResult.error);

  const dateResult = validateString(body.preferredDate, "期望日期", 10);
  if (!dateResult.valid) return badRequest(dateResult.error);
  const preferredDate = body.preferredDate!.trim();
  const bookingDateResult = validateBookingDate(preferredDate, getBusinessDate());
  if (!bookingDateResult.valid) return badRequest(bookingDateResult.error);

  const contact = body.contact!.trim();
  const normalizedContact = contact.toLowerCase();
  const name = body.name!.trim();
  const packageName = body.packageName?.trim() || "未指定";

  if (!context.env.DB) {
    return jsonResponse({ error: "服务暂时不可用" }, 503);
  }

  try {
    const active = await context.env.DB.prepare(
      `select count(*) as count from booking_requests
       where preferred_date = ?
         and status not in ('cancelled', 'canceled')`,
    )
      .bind(preferredDate)
      .first<{ count: number }>();
    const activeBookings = Number(active?.count ?? 0);
    const remaining = Math.max(BOOKING_CAPACITY_PER_DAY - activeBookings, 0);

    if (!isBookingDateFull(activeBookings)) {
      return jsonResponse({
        error: "date_has_capacity",
        message: "该日期仍可直接预约，无需加入候补名单。",
        policy: {
          capacityPerDay: BOOKING_CAPACITY_PER_DAY,
          activeBookings,
          remaining,
        },
      }, 409);
    }

    const existingForContact = await context.env.DB.prepare(
      `select id, preferred_date, active, created_at
       from booking_waitlist
       where preferred_date = ?
         and lower(contact) = ?
         and active = 1
       order by created_at desc
       limit 1`,
    )
      .bind(preferredDate, normalizedContact)
      .first<ExistingWaitlistRow>();

    if (existingForContact) {
      return jsonResponse({
        ok: true,
        message: "already_waitlisted",
        waitlist: {
          id: existingForContact.id,
          preferredDate: existingForContact.preferred_date,
          active: existingForContact.active === 1,
          createdAt: existingForContact.created_at,
          duplicate: true,
        },
        policy: {
          capacityPerDay: BOOKING_CAPACITY_PER_DAY,
          activeBookings,
          remaining: 0,
        },
      });
    }

    const existing = await context.env.DB.prepare(
      `select count(*) as c from booking_waitlist where preferred_date = ? and active = 1`,
    )
      .bind(preferredDate)
      .first<{ c: number }>();

    if ((existing?.c ?? 0) >= MAX_WAITLIST_PER_DAY) {
      return jsonResponse({ error: "该日期的候补名单已满" }, 429);
    }

    const id = `wl_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const createdAt = new Date().toISOString();
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);

    await context.env.DB.prepare(
      `insert into booking_waitlist (id, token, preferred_date, contact, name, package_name, active, notified, created_at)
       values (?, ?, ?, ?, ?, ?, 1, 0, ?)`,
    )
      .bind(
        id,
        token,
        preferredDate,
        contact,
        name,
        packageName,
        createdAt,
      )
      .run();

    return jsonResponse({
      ok: true,
      waitlist: {
        id,
        token,
        preferredDate,
        active: true,
        createdAt,
        unsubscribeToken: token,
      },
      policy: {
        capacityPerDay: BOOKING_CAPACITY_PER_DAY,
        activeBookings,
        remaining: 0,
      },
    }, 201);
  } catch (error) {
    return unavailable("加入候补名单失败", error, { route: "/api/booking/waitlist", method: "POST" });
  }
};
