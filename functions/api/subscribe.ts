import { badRequest, jsonResponse, unavailable } from "../_responses";
import { enforceRateLimit, rateLimited, requirePublicMutationRequest } from "../_security";
import { validateString, validateEmail } from "../_validation";

type SubscribeBody = {
  email?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  const limit = await enforceRateLimit(context.request, context.env, "newsletter-subscribe", 8, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  if (!context.env.DB) {
    return jsonResponse({ error: "订阅功能暂时不可用" }, 503);
  }

  const body = (await context.request.json().catch(() => ({}))) as SubscribeBody;
  const rawEmail = body.email?.trim().toLowerCase() ?? "";

  if (!rawEmail) {
    return badRequest("请输入有效的邮箱地址");
  }

  const emailResult = validateString(rawEmail, "邮箱", 320);
  if (!emailResult.valid) return badRequest(emailResult.error);

  if (!validateEmail(rawEmail)) {
    return badRequest("请输入有效的邮箱地址");
  }

  const email = rawEmail;

  if (!validateEmail(email)) {
    return badRequest("请输入有效的邮箱地址");
  }

  try {
    const existing = await context.env.DB.prepare(
      `select id, active from subscribers where email = ?`,
    )
      .bind(email)
      .first<{ id: string; active: number }>();

    if (existing) {
      if (existing.active === 1) {
        return jsonResponse({ error: "duplicate" }, 409);
      }
      await context.env.DB.prepare(
        `update subscribers set active = 1, subscribed_at = ? where email = ?`,
      )
        .bind(new Date().toISOString(), email)
        .run();
      return jsonResponse({ ok: true });
    }

    const id = crypto.randomUUID();
    const subscribedAt = new Date().toISOString();

    await context.env.DB.prepare(
      `insert into subscribers (id, email, subscribed_at, active)
       values (?, ?, ?, 1)`,
    )
      .bind(id, email, subscribedAt)
      .run();

    return jsonResponse({ ok: true }, 201);
  } catch (error) {
    return unavailable("订阅失败，请稍后重试", error, { route: "/api/subscribe", method: "POST" });
  }
};
