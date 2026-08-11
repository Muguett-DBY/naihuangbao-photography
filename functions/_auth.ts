import { timingSafeEqual } from "./_security";

type AuthEnv = {
  ADMIN_PASSWORD?: string;
  CF_ACCESS_ADMIN_EMAILS?: string;
};

type SessionDatabase = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
    };
  };
};

type ValidatedUserSession = {
  userId: string;
  sessionVersion: number;
};

const adminCookieName = "nhb_admin_session";
const userCookieName = "nhb_user_session";
const maxAgeSeconds = 60 * 60 * 24 * 30;
const adminMutationHeaderName = "x-nhb-admin-action";
const legacyPasswordIterations = 100_000;
const passwordIterations = 600_000;
const passwordHashPrefix = "pbkdf2-sha256";

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
  const allowedAccessEmails = parseEmailList(env.CF_ACCESS_ADMIN_EMAILS);
  if (accessEmail && allowedAccessEmails.has(accessEmail.trim().toLowerCase())) {
    return true;
  }

  if (!env.ADMIN_PASSWORD) {
    return false;
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessions = readCookies(cookieHeader, adminCookieName);
  if (sessions.length === 0) {
    return false;
  }

  for (const session of sessions) {
    if (await isValidSession(session, env.ADMIN_PASSWORD)) {
      return true;
    }
  }

  return false;
}

function parseEmailList(value?: string) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminMutationRequest(request: Request) {
  return request.headers.get(adminMutationHeaderName) === "1";
}

export function adminSessionCookie(session: string) {
  return `${adminCookieName}=${session}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearAdminSessionCookie() {
  return `${adminCookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

// ── User auth helpers ──

export async function createUserSession(userId: string, secret: string, sessionVersion = 0) {
  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload = `${userId}.${sessionVersion}.${expiresAt}`;
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

export async function getUserFromRequest(
  request: Request,
  secret: string,
  db?: SessionDatabase,
): Promise<{ userId: string } | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessions = readCookies(cookieHeader, userCookieName);
  if (sessions.length === 0) {
    return null;
  }

  for (const session of sessions) {
    const result = await validateUserSession(session, secret);
    if (!result) continue;
    if (db && !(await sessionVersionMatches(db, result))) continue;
    return { userId: result.userId };
  }

  return null;
}

export async function getOptionalUserId(
  request: Request,
  env: { AUTH_SECRET?: string; DB?: SessionDatabase },
): Promise<string | null> {
  const secret = env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) return null;
  return (await getUserFromRequest(request, secret, env.DB))?.userId ?? null;
}

async function validateUserSession(session: string, secret: string): Promise<ValidatedUserSession | null> {
  const parts = session.split(".");
  if (parts.length !== 3 && parts.length !== 4) return null;

  const legacy = parts.length === 3;
  const [userId, versionOrExpiry, expiryOrSignature, currentSignature] = parts;
  const sessionVersion = legacy ? 0 : Number(versionOrExpiry);
  const expiresAt = legacy ? versionOrExpiry : expiryOrSignature;
  const signature = legacy ? expiryOrSignature : currentSignature;
  if (!userId || !expiresAt || !signature || !Number.isSafeInteger(sessionVersion) || sessionVersion < 0) return null;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return null;

  const payload = legacy ? `${userId}.${expiresAt}` : `${userId}.${sessionVersion}.${expiresAt}`;
  const expected = await sign(payload, secret);
  if (!timingSafeEqual(signature, expected)) return null;

  return { userId, sessionVersion };
}

async function sessionVersionMatches(db: SessionDatabase, session: ValidatedUserSession) {
  const row = await db.prepare("select session_version from users where id = ?")
    .bind(session.userId)
    .first<{ session_version: number }>();
  return row !== null && Number(row.session_version ?? 0) === session.sessionVersion;
}

export function userSessionCookie(session: string) {
  return `${userCookieName}=${session}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearUserSessionCookie() {
  return `${userCookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

// ── Shared helpers ──

async function isValidSession(session: string, password: string) {
  const [expiresAt, signature] = session.split(".");
  if (!expiresAt || !signature || Number(expiresAt) <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = await sign(expiresAt, password);
  return timingSafeEqual(signature, expected);
}

export function sessionCookie(session: string) {
  return adminSessionCookie(session);
}

export function clearSessionCookie() {
  return clearAdminSessionCookie();
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

export async function hashPassword(password: string, salt: string): Promise<string> {
  const hash = await derivePasswordHash(password, salt, passwordIterations);
  return `${passwordHashPrefix}$${passwordIterations}$${hash}`;
}

export async function verifyPassword(password: string, salt: string, storedHash: string) {
  const modern = parsePasswordHash(storedHash);
  const iterations = modern?.iterations ?? legacyPasswordIterations;
  const expected = modern?.hash ?? storedHash;
  const computed = await derivePasswordHash(password, salt, iterations);
  return timingSafeEqual(computed, expected);
}

export function needsPasswordRehash(storedHash: string) {
  const parsed = parsePasswordHash(storedHash);
  return !parsed || parsed.iterations < passwordIterations;
}

async function derivePasswordHash(password: string, salt: string, iterations: number): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: encoder.encode(salt),
      iterations,
    },
    keyMaterial,
    256,
  );

  return base64Url(bits);
}

function parsePasswordHash(value: string) {
  const [algorithm, rawIterations, hash] = value.split("$");
  const iterations = Number(rawIterations);
  if (algorithm !== passwordHashPrefix || !Number.isSafeInteger(iterations) || iterations < legacyPasswordIterations || !hash) {
    return null;
  }
  return { iterations, hash };
}

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return base64Url(salt.buffer);
}

function readCookies(cookieHeader: string, name: string) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`))
    .map((part) => part.slice(name.length + 1))
    .filter(Boolean);
}

function base64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
