import { jsonResponse, badRequest, unavailable } from "../../../_responses";
import { enforceRateLimit, rateLimited } from "../../../_security";
import { validateId } from "../../../_validation";

type ApiEnv = Env;

// ── POST /api/presets/:id/download ──
export const onRequestPost: PagesFunction<ApiEnv> = async (context) => {
  if (!context.env.DB) {
    return jsonResponse({ error: "服务不可用" }, 503);
  }

  const limit = await enforceRateLimit(context.request, context.env, "preset-download", 10, 60);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  const id = (context.params as Record<string, string>).id;
  const idCheck = validateId(id, "预设 ID");
  if (!idCheck.valid) return badRequest(idCheck.error);

  try {
    await context.env.DB.prepare(
      `update presets set download_count = download_count + 1 where id = ?`,
    ).bind(id).run();

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    console.error("[presets/download]", error);
    return jsonResponse({ ok: false }, 500);
  }
};
