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
  payment_intent_id: string | null;
  payment_status: string;
  payment_provider: string | null;
  payment_amount_cents: number | null;
  payment_currency: string | null;
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
       where b.contact = (select email from users where id = ?)
       order by b.created_at desc`,
    )
      .bind(user.userId)
      .all<BookingRow>();

    const bookings = result.results.map((booking) => ({
      ...booking,
      payment_status: booking.payment_status === "canceled" ? "cancelled" : booking.payment_status,
    }));

    return jsonResponse({ bookings });
  } catch (error) {
    return unavailable("加载预约失败", error, { route: "/api/user/bookings", method: "GET" });
  }
};
