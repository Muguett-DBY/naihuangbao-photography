import { badRequest, jsonResponse, unavailable } from "../_responses";

type SubscribeBody = {
  email?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!context.env.DB) {
    return jsonResponse({ error: "订阅功能暂时不可用" }, 503);
  }

  const body = (await context.request.json().catch(() => ({}))) as SubscribeBody;
  const email = body.email?.trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    return badRequest("请输入有效的邮箱地址");
  }

  if (email.length > 320) {
    return badRequest("邮箱地址过长");
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
