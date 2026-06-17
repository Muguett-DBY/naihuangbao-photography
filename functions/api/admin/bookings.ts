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
};

export const onRequestGet: PagesFunction<AdminBookingsEnv> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) return unauthorized();

  try {
    const result = await context.env.DB.prepare(
      `select id, package_name, preferred_date, preferred_time, name, contact, notes, status, created_at
       from booking_requests
       order by created_at desc`,
    ).all<BookingRow>();

    return jsonResponse({ bookings: result.results });
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
