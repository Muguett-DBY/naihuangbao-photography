import { jsonResponse, badRequest } from "../../_responses";
import { hashPassword, createUserSession, userSessionCookie } from "../../_auth";

type AuthEnv = Env & {
  AUTH_SECRET?: string;
};

export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
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
  if (passwordHash !== user.password_hash) {
    return jsonResponse({ error: "邮箱或密码不正确" }, 401);
  }

  const secret = context.env.AUTH_SECRET || "default-auth-secret";
  const session = await createUserSession(user.id, secret);

  return jsonResponse(
    { ok: true, user: { id: user.id, email: user.email, displayName: user.display_name } },
    200,
    { "set-cookie": userSessionCookie(session) },
  );
};
