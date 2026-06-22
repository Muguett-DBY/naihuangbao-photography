import { isAdminMutationRequest, isAdminRequest } from "../../../_auth";
import { badRequest, forbidden, jsonResponse, unauthorized, unavailable } from "../../../_responses";

type AdminPhotosBatchEnv = Env & { ADMIN_PASSWORD?: string };

type BatchBody = {
  ids?: string[];
  action?: "visibility" | "featured" | "album";
  value?: boolean | string;
};

export const onRequestPost: PagesFunction<AdminPhotosBatchEnv> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) return unauthorized();
  if (!isAdminMutationRequest(context.request)) {
    return forbidden("缺少后台操作校验头");
  }

  const body = (await context.request.json().catch(() => ({}))) as BatchBody;

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return badRequest("请选择至少一张照片");
  }

  if (body.ids.length > 100) {
    return badRequest("单次批量操作最多 100 张照片");
  }

  if (!body.action) {
    return badRequest("缺少操作类型");
  }

  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ error: "数据库未配置" }, 503);
  }

  // Validate all IDs are non-empty strings
  const validIds = body.ids.filter((id) => typeof id === "string" && id.trim());
  if (validIds.length === 0) {
    return badRequest("无效的照片 ID");
  }

  const placeholders = validIds.map(() => "?").join(", ");

  try {
    if (body.action === "visibility") {
      // Toggle visibility: set all selected photos to the specified value
      const vis = body.value === "public" ? "public" : "hidden";
      await db
        .prepare(`update photos set visibility = ? where id in (${placeholders})`)
        .bind(vis, ...validIds)
        .run();

      return jsonResponse({ ok: true, updated: validIds.length, visibility: vis });
    }

    if (body.action === "featured") {
      const feat = body.value === true || body.value === "true" ? 1 : 0;
      await db
        .prepare(`update photos set featured = ? where id in (${placeholders})`)
        .bind(feat, ...validIds)
        .run();

      return jsonResponse({ ok: true, updated: validIds.length, featured: feat });
    }

    if (body.action === "album") {
      const album = typeof body.value === "string" ? body.value.trim().slice(0, 100) : "";
      await db
        .prepare(`update photos set album = ? where id in (${placeholders})`)
        .bind(album || null, ...validIds)
        .run();

      return jsonResponse({ ok: true, updated: validIds.length, album });
    }

    return badRequest("不支持的操作类型");
  } catch (error) {
    return unavailable("批量操作失败", error, {
      route: "/api/admin/photos/batch",
      method: "POST",
    });
  }
};
