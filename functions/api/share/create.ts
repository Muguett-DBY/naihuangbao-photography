import { badRequest, jsonResponse, unavailable } from "../../_responses";
import { getUserFromRequest } from "../../_auth";
import { enforceRateLimit, getRequiredAuthSecret, rateLimited, requirePublicMutationRequest } from "../../_security";
import {
  buildShareLinkRecord,
  hashSharePassword,
  normalizeShareLinkInput,
  SHARE_LINK_LIMITS,
} from "../../../src/lib/share-link";

type CreateShareLinkBody = {
  resourceType?: string;
  resourceId?: string;
  visibility?: string;
  password?: string;
  maxViews?: number;
  expiresInDays?: number;
  createdBy?: string;
};

type ShareEnv = Env & { AUTH_SECRET?: string };

export const onRequestPost: PagesFunction<ShareEnv> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  const secret = getRequiredAuthSecret(context.env);
  const user = secret ? await getUserFromRequest(context.request, secret, context.env.DB) : null;
  if (!user) return jsonResponse({ error: "Sign in to create share links" }, 401);

  const limit = await enforceRateLimit(context.request, context.env, `share-link-create:${user.userId}`, 30, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  const body = (await context.request.json().catch(() => ({}))) as CreateShareLinkBody;

  let normalized;
  try {
    normalized = normalizeShareLinkInput({
      resourceType: (body.resourceType ?? "photo") as "photo" | "album" | "gallery",
      resourceId: body.resourceId ?? "",
      visibility: body.visibility as "public" | "unlisted" | undefined,
      password: body.password,
      maxViews: body.maxViews,
      expiresInDays: body.expiresInDays,
      createdBy: user.userId,
    });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Invalid share link input");
  }

  const passwordHash = normalized.passwordHash
    ? await hashSharePassword(normalized.passwordHash.replace(/^pending:/, ""))
    : null;

  const record = buildShareLinkRecord({ ...normalized, createdBy: user.userId }, passwordHash);

  try {
    await context.env.DB.prepare(
        `insert into share_links (id, token, resource_type, resource_id, visibility, password_hash, max_views, view_count, expires_at, created_at, created_by)
         values (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      )
        .bind(
          record.id,
          record.token,
          record.resourceType,
          record.resourceId,
          record.visibility,
          record.passwordHash,
          record.maxViews,
          record.expiresAt,
          record.createdAt,
          record.createdBy,
        )
      .run();
  } catch (error) {
    return unavailable("Failed to persist share link", error, { route: "/api/share/create", method: "POST" });
  }

  return jsonResponse({
    ok: true,
    link: {
      id: record.id,
      token: record.token,
      resourceType: record.resourceType,
      resourceId: record.resourceId,
      visibility: record.visibility,
      maxViews: record.maxViews,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      requiresPassword: Boolean(record.passwordHash),
    },
    limits: SHARE_LINK_LIMITS,
  }, 201, { "cache-control": "no-store" });
};
