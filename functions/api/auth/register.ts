import { jsonResponse, badRequest } from "../../_responses";
import { hashPassword, generateSalt, createUserSession, userSessionCookie } from "../../_auth";

type AuthEnv = Env & {
  AUTH_SECRET?: string;
};

export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  const body = (await context.request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  if (!body.email || !body.password) {
    return badRequest("邮箱和密码为必填项");
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password.trim();
  const displayName = (body.displayName || email.split("@")[0]).trim();

  if (password.length < 6) {
    return badRequest("密码至少需要6个字符");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest("邮箱格式不正确");
  }

  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ error: "数据库未配置" }, 500);
  }

  const existing = await db.prepare("select id from users where email = ?").bind(email).first();
  if (existing) {
    return jsonResponse({ error: "该邮箱已被注册" }, 409);
  }

  const id = crypto.randomUUID();
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const now = new Date().toISOString();

  await db
    .prepare("insert into users (id, email, password_hash, salt, display_name, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, email, passwordHash, salt, displayName, now, now)
    .run();

  const secret = context.env.AUTH_SECRET || "default-auth-secret";
  const session = await createUserSession(id, secret);

  return jsonResponse(
    { ok: true, user: { id, email, displayName } },
    201,
    { "set-cookie": userSessionCookie(session) },
  );
};
