import { createAdminSession, sessionCookie } from "../../_auth";

type Env = {
  ADMIN_PASSWORD?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = (await context.request.json().catch(() => ({}))) as {
    password?: string;
  };

  if (!context.env.ADMIN_PASSWORD) {
    return json({ error: "后台密码未配置" }, 500);
  }

  if (!body.password) {
    return json({ error: "请输入密码" }, 400);
  }

  const inputPassword = body.password.trim();
  const storedPassword = context.env.ADMIN_PASSWORD.trim();

  const valid = await timingSafeEqual(inputPassword, storedPassword);
  if (!valid) {
    return json({ error: "密码不正确" }, 401);
  }

  const session = await createAdminSession(context.env);
  return json(
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

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}
