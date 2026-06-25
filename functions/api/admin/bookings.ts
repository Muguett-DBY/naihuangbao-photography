import { isAdminMutationRequest, isAdminRequest } from "../../_auth";
import { badRequest, forbidden, jsonResponse, unauthorized, unavailable } from "../../_responses";
import { validateId, validateEnum, validateBody } from "../../_validation";

type AdminBookingsEnv = Env & { ADMIN_PASSWORD?: string };

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
  payment_intent_id: string | null;
  payment_status: string;
  payment_provider: string | null;
  payment_amount_cents: number | null;
  payment_currency: string | null;
};

export const onRequestGet: PagesFunction<AdminBookingsEnv> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) return unauthorized();

  try {
    const result = await context.env.DB.prepare(
      `select b.id, b.package_name, b.preferred_date, b.preferred_time, b.name, b.contact, b.notes,
              case when b.status = 'canceled' then 'cancelled' else b.status end as status,
              b.created_at,
              pi.id as payment_intent_id,
              coalesce(pi.status, 'not_started') as payment_status,
              pi.provider as payment_provider,
              pi.amount_cents as payment_amount_cents,
              pi.currency as payment_currency
       from booking_requests b
       left join payment_intents pi
         on pi.id = (
           select latest.id
           from payment_intents latest
           where latest.purpose = 'booking_deposit'
             and latest.reference_id = b.id
           order by latest.created_at desc
           limit 1
         )
       order by b.created_at desc`,
    ).all<BookingRow>();

    const bookings = result.results.map((booking) => ({
      ...booking,
      payment_status: booking.payment_status === "canceled" ? "cancelled" : booking.payment_status,
    }));

    return jsonResponse({ bookings });
  } catch (error) {
    return unavailable("加载预约失败", error, { route: "/api/admin/bookings", method: "GET" });
  }
};

const bookingStatuses = ["pending", "contacted", "done"] as const;

export const onRequestPatch: PagesFunction<AdminBookingsEnv> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) return unauthorized();
  if (!isAdminMutationRequest(context.request)) {
    return forbidden("缺少后台操作校验头");
  }

  const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;

  const validated = validateBody(body, {
    id: (v) => validateId(v as string, "预约 ID"),
    status: (v) => validateEnum(v, "状态", bookingStatuses),
  });

  if (!validated.valid) {
    return badRequest(validated.error);
  }

  try {
    await context.env.DB.prepare(
      `update booking_requests set status = ? where id = ?`,
    )
      .bind(body.status, body.id)
      .run();

    return jsonResponse({ ok: true });
  } catch (error) {
    return unavailable("更新状态失败", error, { route: "/api/admin/bookings", method: "PATCH" });
  }
};
