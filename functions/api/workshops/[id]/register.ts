import { jsonResponse, badRequest, unavailable } from "../../../_responses";
import { getOptionalUserId } from "../../../_auth";
import { enforceRateLimit, rateLimited, requirePublicMutationRequest } from "../../../_security";
import { validateString, validateOptionalString, validatePositiveInt } from "../../../_validation";

type ApiEnv = Env & { AUTH_SECRET?: string };

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

  // Validate inputs
  const nameResult = validateString(body.name, "姓名", 50);
  if (!nameResult.valid) return badRequest(nameResult.error);

  const contactResult = validateString(body.contact, "联系方式", 100);
  if (!contactResult.valid) return badRequest(contactResult.error);

  const notesResult = validateOptionalString(body.notes, "备注", 500);
  if (!notesResult.valid) return badRequest(notesResult.error);

  if (body.participants !== undefined) {
    const participantResult = validatePositiveInt(body.participants, "参与人数");
    if (!participantResult.valid) return badRequest(participantResult.error);
  }

  const name = body.name!.trim();
  const contact = body.contact!.trim();
  const userId = await getOptionalUserId(context.request, context.env);

  try {
    const workshop = await context.env.DB.prepare(
      `select id, max_participants, current_participants from workshops where id = ? and status = 'upcoming'`,
    ).bind(id).first() as { id: string; max_participants: number; current_participants: number } | null;

    if (!workshop) {
      return jsonResponse({ error: "活动不存在或已结束" }, 404);
    }

    const participants = Math.max(1, body.participants || 1);
    const maxParticipants = Number(workshop.max_participants ?? 0);
    const currentParticipants = Number(workshop.current_participants ?? 0);

    if (
      !Number.isInteger(maxParticipants)
      || !Number.isInteger(currentParticipants)
      || maxParticipants < 0
      || currentParticipants < 0
    ) {
      return unavailable(
        "活动名额配置异常，请稍后重试",
        new Error("Invalid workshop capacity"),
        { route: `/api/workshops/${id}/register`, method: "POST" },
      );
    }

    const hasParticipantLimit = maxParticipants > 0;
    const spotsLeft = hasParticipantLimit
      ? Math.max(0, maxParticipants - currentParticipants)
      : null;

    if (hasParticipantLimit && spotsLeft === 0) {
      return jsonResponse({ error: "名额已满" }, 409);
    }

    if (spotsLeft !== null && participants > spotsLeft) {
      return jsonResponse({ error: `最多可报 ${spotsLeft} 人` }, 409);
    }

    const regId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await context.env.DB.batch([
      context.env.DB.prepare(
        `insert into workshop_registrations (id, workshop_id, name, contact, user_id, participants, notes, status, created_at)
         values (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      ).bind(regId, id, name, contact, userId, participants, body.notes ?? "", createdAt),
      context.env.DB.prepare(
        `update workshops set current_participants = current_participants + ? where id = ?`,
      ).bind(participants, id),
    ]);

    return jsonResponse({ ok: true, id: regId, accountLinked: userId !== null }, 201);
  } catch (error) {
    return unavailable("报名失败，请稍后重试", error, { route: `/api/workshops/${id}/register`, method: "POST" });
  }
};
