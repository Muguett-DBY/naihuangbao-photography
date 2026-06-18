import { jsonResponse, badRequest, unavailable } from "../../_responses";
import { enforceRateLimit, getRequiredAuthSecret, isValidEmail, rateLimited } from "../../_security";
import { hashPassword } from "../../_auth";

type AuthEnv = Env & { AUTH_SECRET?: string };

type UserRow = {
  id: string;
  email: string;
};

export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  const limit = await enforceRateLimit(context.request, context.env, "forgot-password", 5, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  const body = (await context.request.json().catch(() => ({}))) as { email?: string };

  if (!body.email) {
    return badRequest("邮箱为必填项");
  }

  const email = body.email.trim().toLowerCase();
  if (!isValidEmail(email)) {
    return badRequest("邮箱格式不正确");
  }

  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ error: "数据库未配置" }, 503);
  }

  // Always return success to prevent email enumeration
  const user = await db.prepare("select id, email from users where email = ?").bind(email).first<UserRow>();

  if (!user) {
    return jsonResponse({ ok: true, message: "如果该邮箱已注册，重置链接已发送" });
  }

  // Generate token: random bytes → hex
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, "0")).join("");

  // Hash the token for storage (never store plaintext)
  const tokenHash = await sha256Hex(token);

  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour
  const createdAt = now.toISOString();

  // Invalidate any existing unused tokens for this user
  await db.prepare(
    `update password_reset_tokens set used = 1 where user_id = ? and used = 0`,
  ).bind(user.id).run();

  // Store hashed token
  await db.prepare(
    `insert into password_reset_tokens (id, user_id, token_hash, expires_at, used, created_at)
     values (?, ?, ?, ?, 0, ?)`,
  ).bind(id, user.id, tokenHash, expiresAt, createdAt).run();

  // In demo mode (no email provider configured), return token directly
  // In production, this would send an email with the token
  const resendKey = (context.env as { RESEND_API_KEY?: string }).RESEND_API_KEY;
  const sendEmailFn = (context.env as { SEND_EMAIL?: unknown }).SEND_EMAIL;
  const hasEmailProvider = !!(resendKey || sendEmailFn);

  if (hasEmailProvider) {
    // TODO: Send email with reset link containing the token
    // await sendResetEmail(user.email, token);
    return jsonResponse({ ok: true, message: "如果该邮箱已注册，重置链接已发送" });
  }

  // Demo mode: return token in response only if explicitly enabled
  // In production, this code path should never run (email provider should be configured)
  const isDemoMode = !!(context.env as { DEMO_MODE?: string }).DEMO_MODE;
  if (!isDemoMode) {
    // Production without email — log warning but never return token
    console.warn("[forgot-password] No email provider configured and DEMO_MODE not set. Token generated but not delivered.");
    return jsonResponse({ ok: true, message: "如果该邮箱已注册，重置链接已发送" });
  }

  return jsonResponse({
    ok: true,
    message: "密码重置令牌已生成（演示模式）",
    demo_token: token,
    demo_note: "生产环境中此令牌将通过邮件发送，不会出现在响应中",
  });
};

async function sha256Hex(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
