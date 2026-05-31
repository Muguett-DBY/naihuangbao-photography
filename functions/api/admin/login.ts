import { createAdminSession, sessionCookie } from "../../_auth";
import { badRequest, jsonResponse } from "../../_responses";
import { enforceRateLimit, rateLimited } from "../../_security";

type AdminLoginEnv = Env & {
  ADMIN_PASSWORD?: string;
};

export const onRequestPost: PagesFunction<AdminLoginEnv> = async (context) => {
  const limit = await enforceRateLimit(context.request, context.env, "admin-login", 8, 60 * 15);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  const body = (await context.request.json().catch(() => ({}))) as {
    password?: string;
  };

  if (!context.env.ADMIN_PASSWORD) {
    return jsonResponse({ error: "后台密码未配置" }, 500);
  }

  if (!body.password) {
    return badRequest("请输入密码");
  }

  const inputPassword = body.password.trim();
  const storedPassword = context.env.ADMIN_PASSWORD.trim();

  const valid = await timingSafeEqual(inputPassword, storedPassword);
  if (!valid) {
    return jsonResponse({ error: "密码不正确" }, 401);
  }

  const session = await createAdminSession(context.env);
  return jsonResponse(
    { ok: true },
    200,
    {
      "set-cookie": sessionCookie(session),
    },
  );
};

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  if (aBytes.byteLength !== bBytes.byteLength) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    aBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const aSig = await crypto.subtle.sign("HMAC", key, aBytes);
  const bSig = await crypto.subtle.sign("HMAC", key, bBytes);

  return timingSafeCompare(new Uint8Array(aSig), new Uint8Array(bSig));
}

function timingSafeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let result = 0;
  for (let i = 0; i < a.byteLength; i++) {
    result |= a[i]! ^ b[i]!;
  }
  return result === 0;
}
