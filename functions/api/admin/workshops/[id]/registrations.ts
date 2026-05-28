import { isAdminRequest } from "../../../../_auth";
import { jsonResponse, unauthorized, unavailable } from "../../../../_responses";

type AdminEnv = Env & { ADMIN_PASSWORD?: string };

// ── GET /api/admin/workshops/:id/registrations ──
export const onRequestGet: PagesFunction<AdminEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) {
    return unauthorized();
  }

  const id = (context.params as Record<string, string>).id;

  try {
    const result = await context.env.DB.prepare(
      `select * from workshop_registrations where workshop_id = ? order by created_at desc`,
    ).bind(id).all();

    return jsonResponse({ registrations: result.results });
  } catch (error) {
    return unavailable("加载失败", error, { route: `/api/admin/workshops/${id}/registrations` });
  }
};
