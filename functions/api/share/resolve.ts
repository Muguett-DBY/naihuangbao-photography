import { badRequest, jsonResponse, unavailable } from "../../_responses";
import { enforceRateLimit, rateLimited, requirePublicMutationRequest } from "../../_security";
import { verifySharePassword, SHARE_LINK_LIMITS } from "../../../src/lib/share-link";

type ResolveBody = {
  token?: string;
  password?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  const limit = await enforceRateLimit(context.request, context.env, "share-link-resolve", 60, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  const body = (await context.request.json().catch(() => ({}))) as ResolveBody;
  const token = body.token?.trim();
  if (!token || token.length < SHARE_LINK_LIMITS.SHARE_TOKEN_LENGTH) {
    return badRequest("Share token is required");
  }

  if (!context.env.DB) {
    return jsonResponse({ error: "Share service temporarily unavailable" }, 503);
  }

  try {
    const row = await context.env.DB.prepare(
      `select id, token, resource_type, resource_id, visibility, password_hash, max_views, view_count, expires_at, created_at, created_by
       from share_links where token = ?`,
    )
      .bind(token)
      .first<{
        id: string;
        token: string;
        resource_type: string;
        resource_id: string;
        visibility: string;
        password_hash: string | null;
        max_views: number | null;
        view_count: number;
        expires_at: string | null;
        created_at: string;
        created_by: string | null;
      }>();

    if (!row) return jsonResponse({ error: "Share link not found" }, 404);

    if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
      return jsonResponse({ error: "expired" }, 410);
    }

    if (row.max_views !== null && row.view_count >= row.max_views) {
      return jsonResponse({ error: "max_views_reached" }, 410);
    }

    if (row.password_hash) {
      const supplied = body.password ?? "";
      if (!supplied) {
        return jsonResponse({ error: "password_required" }, 401);
      }
      const ok = await verifySharePassword(supplied, row.password_hash);
      if (!ok) {
        return jsonResponse({ error: "password_invalid" }, 401);
      }
    }

    await context.env.DB.prepare(
      `update share_links set view_count = view_count + 1 where id = ?`,
    )
      .bind(row.id)
      .run();

    return jsonResponse({
      ok: true,
      resource: {
        type: row.resource_type,
        id: row.resource_id,
        visibility: row.visibility,
      },
      viewCount: row.view_count + 1,
    });
  } catch (error) {
    return unavailable("Failed to resolve share link", error, { route: "/api/share/resolve", method: "POST" });
  }
};
