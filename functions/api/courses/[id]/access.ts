import { jsonResponse } from "../../../_responses";
import { getUserFromRequest } from "../../../_auth";

type AuthEnv = Env & { AUTH_SECRET?: string };

export const onRequestGet: PagesFunction<AuthEnv> = async (context) => {
  const id = (context.params as Record<string, string>).id;

  if (!context.env.DB) {
    return jsonResponse({ hasAccess: false }, 503);
  }

  const course = await context.env.DB.prepare(
    `SELECT id, price_cents FROM courses WHERE id = ? AND published = 1`,
  ).bind(id).first<{ id: string; price_cents: number }>();

  if (!course) {
    return jsonResponse({ hasAccess: false }, 404);
  }

  if (!course.price_cents || course.price_cents <= 0) {
    return jsonResponse({ hasAccess: true });
  }

  const secret = context.env.AUTH_SECRET || "default-auth-secret";
  const user = await getUserFromRequest(context.request, secret);

  if (!user) {
    return jsonResponse({ hasAccess: false });
  }

  const purchase = await context.env.DB.prepare(
    `SELECT id FROM course_purchases WHERE course_id = ? AND user_id = ?`,
  ).bind(id, user.userId).first();

  return jsonResponse({ hasAccess: !!purchase });
};
