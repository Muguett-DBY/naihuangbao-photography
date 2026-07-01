import { isAdminMutationRequest, isAdminRequest } from "../../../_auth";
import { deletePhotosWithConsistency, flushQueuedPhotoObjectDeletes } from "../../../_photos";
import { badRequest, forbidden, jsonResponse, logWorkerError, unauthorized, unavailable } from "../../../_responses";
import { logAuditEvent } from "../../../lib/audit-log";

type AdminPhotosBatchEnv = Env & { ADMIN_PASSWORD?: string };

type BatchBody = {
  ids?: string[];
  action?: "visibility" | "featured" | "album" | "delete";
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

  if (body.ids.some((id) => typeof id !== "string" || !id.trim())) {
    return badRequest("无效的照片 ID");
  }
  const validIds = Array.from(new Set(body.ids.map((id) => id.trim())));

  const placeholders = validIds.map(() => "?").join(", ");

  try {
    if (body.action === "visibility") {
      const vis = body.value === "public" ? "public" : "hidden";
      await db
        .prepare(`update photos set visibility = ? where id in (${placeholders})`)
        .bind(vis, ...validIds)
        .run();

      await logAuditEvent(context, {
        action: `batch_${body.action}`,
        entity_type: "photo",
        diff_json: JSON.stringify({ count: validIds.length, visibility: vis }),
      });

      return jsonResponse({ ok: true, updated: validIds.length, visibility: vis });
    }

    if (body.action === "featured") {
      const feat = body.value === true || body.value === "true" ? 1 : 0;
      await db
        .prepare(`update photos set featured = ? where id in (${placeholders})`)
        .bind(feat, ...validIds)
        .run();

      await logAuditEvent(context, {
        action: `batch_${body.action}`,
        entity_type: "photo",
        diff_json: JSON.stringify({ count: validIds.length, featured: feat === 1 }),
      });

      return jsonResponse({ ok: true, updated: validIds.length, featured: feat });
    }

    if (body.action === "album") {
      const album = typeof body.value === "string" ? body.value.trim().slice(0, 100) : "";
      await db
        .prepare(`update photos set album = ? where id in (${placeholders})`)
        .bind(album || null, ...validIds)
        .run();

      await logAuditEvent(context, {
        action: `batch_${body.action}`,
        entity_type: "photo",
        diff_json: JSON.stringify({ count: validIds.length, album }),
      });

      return jsonResponse({ ok: true, updated: validIds.length, album });
    }

    if (body.action === "delete") {
      const result = await deletePhotosWithConsistency(context.env, validIds);
      if (!result.ok) {
        return jsonResponse({ error: result.error }, result.status);
      }

      await logAuditEvent(context, {
        action: "batch_delete",
        entity_type: "photo",
        diff_json: JSON.stringify({ count: result.deleted }),
      });

      context.waitUntil(flushQueuedPhotoObjectDeletes(context.env).catch((error) => {
        logWorkerError("照片 R2 清理队列冲刷失败", error, { route: "/api/admin/photos/batch", method: "POST" });
      }));
      if (context.env.CACHE) {
        context.waitUntil(context.env.CACHE.delete("photos:public").catch((error) => {
          logWorkerError("作品缓存失效失败", error, { route: "/api/admin/photos/batch", method: "POST" });
        }));
      }
      return jsonResponse({
        ok: true,
        deleted: result.deleted,
        ids: result.ids,
        cleanupQueued: result.cleanupQueued,
      });
    }

    return badRequest("不支持的操作类型");
  } catch (error) {
    return unavailable("批量操作失败", error, {
      route: "/api/admin/photos/batch",
      method: "POST",
    });
  }
};
