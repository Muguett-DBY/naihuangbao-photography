import { badRequest, jsonResponse, unavailable } from "../_responses";
import { enforceRateLimit, rateLimited, requirePublicMutationRequest } from "../_security";

type BookingBody = {
  packageName?: string;
  preferredDate?: string;
  preferredTime?: string;
  name?: string;
  contact?: string;
  notes?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  const limit = await enforceRateLimit(context.request, context.env, "booking-submit", 6, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  if (!context.env.DB) {
    return jsonResponse({ error: "预约功能暂时不可用" }, 503);
  }

  const body = (await context.request.json().catch(() => ({}))) as BookingBody;

  const name = body.name?.trim();
  const contact = body.contact?.trim();

  if (!name || !contact) {
    return badRequest("请填写姓名和联系方式");
  }

  if (contact.length > 200) {
    return badRequest("联系方式过长");
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    await context.env.DB.prepare(
      `insert into booking_requests (id, package_name, preferred_date, preferred_time, name, contact, notes, status, created_at)
       values (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
      .bind(
        id,
        body.packageName ?? "",
        body.preferredDate ?? "",
        body.preferredTime ?? "",
        name,
        contact,
        body.notes ?? "",
        createdAt,
      )
      .run();

    return jsonResponse({ ok: true, id }, 201);
  } catch (error) {
    return unavailable("提交失败，请稍后重试。", error, { route: "/api/booking", method: "POST" });
  }
};
