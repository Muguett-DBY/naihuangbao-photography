import { jsonResponse, badRequest } from "../../_responses";
import { hashPassword, createUserSession, userSessionCookie } from "../../_auth";
import { authSecretUnavailable, enforceRateLimit, getRequiredAuthSecret, rateLimited, requirePublicMutationRequest, timingSafeEqual } from "../../_security";

type AuthEnv = Env & {
  AUTH_SECRET?: string;
};

export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  const limit = await enforceRateLimit(context.request, context.env, "auth-login", 10, 60 * 15);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  const body = (await context.request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  if (!body.email || !body.password) {
    return badRequest("邮箱和密码为必填项");
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password.trim();

  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ error: "数据库未配置" }, 500);
  }

  const user = await db
    .prepare("select id, email, password_hash, salt, display_name from users where email = ?")
    .bind(email)
    .first<{ id: string; email: string; password_hash: string; salt: string; display_name: string }>();

  if (!user) {
    return jsonResponse({ error: "邮箱或密码不正确" }, 401);
  }

  const passwordHash = await hashPassword(password, user.salt);
  if (!timingSafeEqual(passwordHash, user.password_hash)) {
    return jsonResponse({ error: "邮箱或密码不正确" }, 401);
  }

  const secret = getRequiredAuthSecret(context.env);
  if (!secret) return authSecretUnavailable();

  const session = await createUserSession(user.id, secret);

  return jsonResponse(
    { ok: true, user: { id: user.id, email: user.email, displayName: user.display_name } },
    200,
    { "set-cookie": userSessionCookie(session) },
  );
};
