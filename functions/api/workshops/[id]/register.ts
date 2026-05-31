import { jsonResponse, badRequest, unavailable } from "../../../_responses";
import { enforceRateLimit, rateLimited, requirePublicMutationRequest } from "../../../_security";

type ApiEnv = Env;

// ── POST /api/workshops/:id/register ──
export const onRequestPost: PagesFunction<ApiEnv> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  const limit = await enforceRateLimit(context.request, context.env, "workshop-register", 8, 60 * 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  if (!context.env.DB) {
    return jsonResponse({ error: "服务不可用" }, 503);
  }

  const id = (context.params as Record<string, string>).id;
  const body = (await context.request.json().catch(() => ({}))) as {
    name?: string;
    contact?: string;
    participants?: number;
    notes?: string;
  };

  const name = body.name?.trim();
  const contact = body.contact?.trim();

  if (!name || !contact) {
    return badRequest("请填写姓名和联系方式");
  }

  try {
    const workshop = await context.env.DB.prepare(
      `select id, max_participants, current_participants from workshops where id = ? and status = 'upcoming'`,
    ).bind(id).first() as { id: string; max_participants: number; current_participants: number } | null;

    if (!workshop) {
      return jsonResponse({ error: "活动不存在或已结束" }, 404);
    }

    const participants = Math.max(1, body.participants || 1);
    const spotsLeft = (workshop.max_participants || 0) - workshop.current_participants;

    if (spotsLeft <= 0) {
      return jsonResponse({ error: "名额已满" }, 409);
    }

    if (participants > spotsLeft) {
      return jsonResponse({ error: `最多可报 ${spotsLeft} 人` }, 409);
    }

    const regId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await context.env.DB.batch([
      context.env.DB.prepare(
        `insert into workshop_registrations (id, workshop_id, name, contact, participants, notes, status, created_at)
         values (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      ).bind(regId, id, name, contact, participants, body.notes ?? "", createdAt),
      context.env.DB.prepare(
        `update workshops set current_participants = current_participants + ? where id = ?`,
      ).bind(participants, id),
    ]);

    return jsonResponse({ ok: true, id: regId }, 201);
  } catch (error) {
    return unavailable("报名失败，请稍后重试", error, { route: `/api/workshops/${id}/register`, method: "POST" });
  }
};
