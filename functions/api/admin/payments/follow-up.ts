import { isAdminMutationRequest, isAdminRequest } from "../../../_auth";
import { jsonResponse, unauthorized, unavailable } from "../../../_responses";

type FollowUpEnv = Env & { ADMIN_PASSWORD?: string };

const DEFAULT_TIMEOUT_MINUTES = 30;
const MAX_TIMEOUT_MINUTES = 24 * 60;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

type StalePaymentRow = {
  id: string;
  purpose: string;
  reference_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  provider: string;
  created_at: string;
  updated_at: string;
  age_minutes: number;
};

function clampTimeoutMinutes(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return DEFAULT_TIMEOUT_MINUTES;
  return Math.min(Math.max(1, Math.floor(num)), MAX_TIMEOUT_MINUTES);
}

function clampLimit(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.max(1, Math.floor(num)), MAX_LIMIT);
}

function buildExpiryMetadata(existing: string, nowIso: string, timeoutMinutes: number): string {
  let parsed: Record<string, unknown> = {};
  if (existing) {
    try {
      const value = JSON.parse(existing);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        parsed = value as Record<string, unknown>;
      }
    } catch {
      parsed = {};
    }
  }
  parsed.expired_at = nowIso;
  parsed.expiry_timeout_minutes = timeoutMinutes;
  parsed.expired_reason = "abandoned_placeholder";
  return JSON.stringify(parsed);
}

export const onRequestGet: PagesFunction<FollowUpEnv> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) return unauthorized();

  const url = new URL(context.request.url);
  const timeoutMinutes = clampTimeoutMinutes(url.searchParams.get("timeoutMinutes"));
  const limit = clampLimit(url.searchParams.get("limit"));
  const includeAlreadyExpired = url.searchParams.get("includeExpired") === "1";

  if (!context.env.DB) {
    return unavailable("Payment follow-up unavailable", undefined, { route: "/api/admin/payments/follow-up", method: "GET" });
  }

  try {
    const cutoffIso = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();
    const result = await context.env.DB.prepare(
      `select id, purpose, reference_id, amount_cents, currency, status, provider, created_at, updated_at,
              cast((julianday('now') - julianday(created_at)) * 24 * 60 as integer) as age_minutes
       from payment_intents
       where status in ('pending', 'processing', 'expired')
         and created_at < ?
         and provider = 'placeholder'
         and (? = 1 or status != 'expired')
       order by created_at asc
       limit ?`,
    )
      .bind(cutoffIso, includeAlreadyExpired ? 1 : 0, limit)
      .all<StalePaymentRow>();

    const payments = result.results.map((row) => ({
      ...row,
      timeoutMinutes,
      isStale: row.status !== "expired",
    }));

    return jsonResponse({
      payments,
      timeoutMinutes,
      cutoffIso,
      count: payments.length,
    });
  } catch (error) {
    return unavailable("Failed to load stale payments", error, { route: "/api/admin/payments/follow-up", method: "GET" });
  }
};

type ExpireBody = {
  paymentIntentIds?: unknown;
  timeoutMinutes?: unknown;
};

export const onRequestPost: PagesFunction<FollowUpEnv> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) return unauthorized();
  if (!isAdminMutationRequest(context.request)) {
    return jsonResponse({ error: "缺少后台操作校验头" }, 403);
  }

  if (!context.env.DB) {
    return unavailable("Payment expiry unavailable", undefined, { route: "/api/admin/payments/follow-up", method: "POST" });
  }

  const body = (await context.request.json().catch(() => ({}))) as ExpireBody;
  const explicitIds = Array.isArray(body.paymentIntentIds)
    ? body.paymentIntentIds.filter((value): value is string => typeof value === "string" && value.length >= 8)
    : null;
  const timeoutMinutes = clampTimeoutMinutes(body.timeoutMinutes);
  const cutoffIso = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  try {
    const candidates = explicitIds && explicitIds.length > 0
      ? await context.env.DB.prepare(
          `select id, status, metadata from payment_intents
           where provider = 'placeholder' and status in ('pending', 'processing') and id in (${explicitIds.map(() => "?").join(",")})`,
        )
          .bind(...explicitIds)
          .all<{ id: string; status: string; metadata: string | null }>()
      : await context.env.DB.prepare(
          `select id, status, metadata from payment_intents
           where provider = 'placeholder' and status in ('pending', 'processing') and created_at < ?`,
        )
          .bind(cutoffIso)
          .all<{ id: string; status: string; metadata: string | null }>();

    const expired: string[] = [];
    const skipped: { id: string; reason: string }[] = [];

    for (const row of candidates.results) {
      const nextMetadata = buildExpiryMetadata(row.metadata ?? "", nowIso, timeoutMinutes);
      const update = await context.env.DB.prepare(
        `update payment_intents
         set status = 'expired', updated_at = ?, metadata = ?
         where id = ? and status in ('pending', 'processing')`,
      )
        .bind(nowIso, nextMetadata, row.id)
        .run();

      if (update.meta && typeof update.meta.changes === "number" && update.meta.changes > 0) {
        expired.push(row.id);
      } else {
        skipped.push({ id: row.id, reason: "status_changed" });
      }
    }

    return jsonResponse({
      ok: true,
      expired,
      skipped,
      timeoutMinutes,
      cutoffIso,
      expiredCount: expired.length,
    });
  } catch (error) {
    return unavailable("Failed to expire stale payments", error, { route: "/api/admin/payments/follow-up", method: "POST" });
  }
};
