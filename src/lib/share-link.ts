/**
 * Share link utilities for creating and validating shareable photo links.
 * Privacy controls: expiry, max views, optional password hash.
 */

const SHARE_TOKEN_LENGTH = 12;
const MAX_VIEW_LIMIT = 1000;
const MAX_EXPIRY_DAYS = 90;

export type ShareLinkType = "photo" | "album" | "gallery";
export type ShareLinkVisibility = "public" | "unlisted";

export type ShareLink = {
  id: string;
  token: string;
  resourceType: ShareLinkType;
  resourceId: string;
  visibility: ShareLinkVisibility;
  passwordHash: string | null;
  maxViews: number | null;
  viewCount: number;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string | null;
};

export type ShareLinkInput = {
  resourceType: ShareLinkType;
  resourceId: string;
  visibility?: ShareLinkVisibility;
  password?: string;
  maxViews?: number;
  expiresInDays?: number;
  createdBy?: string;
};

function clampInt(value: number | undefined, min: number, max: number, fallback: number | null): number | null {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function generateShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SHARE_TOKEN_LENGTH));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashSharePassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`nhb-share:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifySharePassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return true;
  const computed = await hashSharePassword(password);
  return timingSafeEqualHex(computed, hash);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function normalizeShareLinkInput(input: ShareLinkInput): {
  resourceType: ShareLinkType;
  resourceId: string;
  visibility: ShareLinkVisibility;
  maxViews: number | null;
  expiresAt: string | null;
  passwordHash: string | null;
  createdBy: string | null;
} {
  const resourceType = input.resourceType;
  const resourceId = input.resourceId?.trim();
  if (!resourceType || !["photo", "album", "gallery"].includes(resourceType)) {
    throw new Error("Invalid resource type");
  }
  if (!resourceId || resourceId.length < 1) {
    throw new Error("Resource ID is required");
  }

  const visibility: ShareLinkVisibility = input.visibility === "unlisted" ? "unlisted" : "public";
  const maxViews = clampInt(input.maxViews, 1, MAX_VIEW_LIMIT, null);
  const expiresInDays = clampInt(input.expiresInDays, 1, MAX_EXPIRY_DAYS, null);
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const password = input.password?.trim() ?? "";
  const passwordHash = password ? `pending:${password}` : null;
  const createdBy = input.createdBy?.trim() || null;

  return {
    resourceType,
    resourceId,
    visibility,
    maxViews,
    expiresAt,
    passwordHash,
    createdBy,
  };
}

export function buildShareLinkRecord(
  normalized: ReturnType<typeof normalizeShareLinkInput>,
  passwordHash: string | null,
): ShareLink {
  const now = new Date().toISOString();
  return {
    id: `share_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
    token: generateShareToken(),
    resourceType: normalized.resourceType,
    resourceId: normalized.resourceId,
    visibility: normalized.visibility,
    passwordHash,
    maxViews: normalized.maxViews,
    viewCount: 0,
    expiresAt: normalized.expiresAt,
    createdAt: now,
    createdBy: normalized.createdBy,
  };
}

export type ShareLinkAccessResult =
  | { allowed: true; link: ShareLink }
  | { allowed: false; reason: "expired" | "max_views_reached" | "not_found" };

export function evaluateShareLinkAccess(
  link: ShareLink | null | undefined,
  now: Date = new Date(),
): ShareLinkAccessResult {
  if (!link) return { allowed: false, reason: "not_found" };
  if (link.expiresAt && new Date(link.expiresAt).getTime() <= now.getTime()) {
    return { allowed: false, reason: "expired" };
  }
  if (link.maxViews !== null && link.viewCount >= link.maxViews) {
    return { allowed: false, reason: "max_views_reached" };
  }
  return { allowed: true, link };
}

export const SHARE_LINK_LIMITS = {
  MAX_VIEW_LIMIT,
  MAX_EXPIRY_DAYS,
  SHARE_TOKEN_LENGTH,
};
