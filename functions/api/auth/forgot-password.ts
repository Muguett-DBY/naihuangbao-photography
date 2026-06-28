import { jsonResponse, badRequest, logWorkerError } from "../../_responses";
import { enforceRateLimit, isValidEmail, rateLimited } from "../../_security";

type AuthEnv = Env & {
  AUTH_SECRET?: string;
  DEMO_MODE?: string;
  RESEND_API_KEY?: string;
  RESET_EMAIL_FROM?: string;
};

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

  const resendKey = context.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      await sendResetEmail({
        apiKey: resendKey,
        from: context.env.RESET_EMAIL_FROM?.trim() || "Naihuangbao Photography <noreply@shoot.custard.top>",
        origin: new URL(context.request.url).origin,
        to: user.email,
        token,
      });
    } catch (error) {
      logWorkerError("Password reset email delivery failed", error, {
        route: "/api/auth/forgot-password",
        method: "POST",
      });
    }
    return jsonResponse({ ok: true, message: "如果该邮箱已注册，重置链接已发送" });
  }

  // Demo mode: return token in response only if explicitly enabled
  // In production, this code path should never run (email provider should be configured)
  const isDemoMode = !!context.env.DEMO_MODE;
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

async function sendResetEmail({
  apiKey,
  from,
  origin,
  to,
  token,
}: {
  apiKey: string;
  from: string;
  origin: string;
  to: string;
  token: string;
}) {
  const loginUrl = `${origin}/login`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "奶黄包摄影密码重置",
      text: [
        "你正在重置奶黄包摄影账号密码。",
        "",
        `重置令牌：${token}`,
        `登录页：${loginUrl}`,
        "",
        "令牌 1 小时内有效。如果不是你本人操作，可以忽略这封邮件。",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    throw new Error("reset email delivery failed");
  }
}
