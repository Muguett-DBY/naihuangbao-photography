import { jsonResponse, badRequest, unavailable } from "../../_responses";
import { enforceRateLimit, rateLimited, requirePublicMutationRequest } from "../../_security";
import { hashPassword, generateSalt } from "../../_auth";

type AuthEnv = Env & { AUTH_SECRET?: string };

type ResetTokenRow = {
  id: string;
  user_id: string;
  expires_at: string;
};

type UserRow = {
  id: string;
  email: string;
};

export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  const limit = await enforceRateLimit(context.request, context.env, "reset-password", 5, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  const body = (await context.request.json().catch(() => ({}))) as {
    token?: string;
    newPassword?: string;
  };

  if (!body.token || !body.newPassword) {
    return badRequest("令牌和新密码为必填项");
  }

  const token = body.token.trim();
  const newPassword = body.newPassword.trim();

  if (newPassword.length < 8) {
    return badRequest("新密码至少需要8个字符");
  }

  if (newPassword.length > 128) {
    return badRequest("新密码不能超过128个字符");
  }

  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ error: "数据库未配置" }, 503);
  }

  // Hash the provided token to match stored hash
  const tokenHash = await sha256Hex(token);

  const now = new Date().toISOString();
  const tokenRow = await db.prepare(
    `select id, user_id, expires_at
     from password_reset_tokens
     where token_hash = ? and used = 0`,
  ).bind(tokenHash).first<ResetTokenRow>();

  if (!tokenRow) {
    return badRequest("无效的重置令牌");
  }

  if (tokenRow.expires_at < now) {
    return badRequest("该令牌已过期");
  }

  const user = await db.prepare(
    `select id from users where id = ?`,
  ).bind(tokenRow.user_id).first<UserRow>();

  if (!user) {
    return badRequest("用户不存在");
  }

  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);
  const updatedAt = new Date().toISOString();

  const claimed = await db.prepare(
    `update password_reset_tokens
     set used = 1
     where id = ? and used = 0 and expires_at >= ?
     returning user_id`,
  ).bind(tokenRow.id, updatedAt).first<{ user_id: string }>();
  if (!claimed || claimed.user_id !== user.id) {
    return badRequest("该令牌已被使用或已过期");
  }

  await db.prepare(
    `update users
     set password_hash = ?, salt = ?, session_version = session_version + 1, updated_at = ?
     where id = ?`,
  ).bind(newHash, newSalt, updatedAt, user.id).run();

  return jsonResponse({
    ok: true,
    message: "密码已重置，请使用新密码登录",
  });
};

async function sha256Hex(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
