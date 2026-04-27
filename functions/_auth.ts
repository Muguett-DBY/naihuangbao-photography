type AuthEnv = {
  ADMIN_PASSWORD?: string;
};

const cookieName = "nhb_admin_session";
const maxAgeSeconds = 60 * 60 * 24 * 30;

export async function createAdminSession(env: AuthEnv) {
  if (!env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is not configured");
  }

  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload = String(expiresAt);
  const signature = await sign(payload, env.ADMIN_PASSWORD);
  return `${payload}.${signature}`;
}

export async function isAdminRequest(request: Request, env: AuthEnv) {
  const accessEmail = request.headers.get("cf-access-authenticated-user-email");
  if (accessEmail) {
    return true;
  }

  if (!env.ADMIN_PASSWORD) {
    return false;
  }

  const cookie = request.headers.get("cookie") ?? "";
  const session = readCookie(cookie, cookieName);
  if (!session) {
    return false;
  }

  const [expiresAt, signature] = session.split(".");
  if (!expiresAt || !signature || Number(expiresAt) <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = await sign(expiresAt, env.ADMIN_PASSWORD);
  return signature === expected;
}

export function sessionCookie(session: string) {
  return `${cookieName}=${session}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${cookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

async function sign(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64Url(signature);
}

function readCookie(cookieHeader: string, name: string) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function base64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
