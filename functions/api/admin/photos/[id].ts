import { isAdminMutationRequest, isAdminRequest } from "../../../_auth";
import { deletePhotoWithConsistency, flushQueuedPhotoObjectDeletes } from "../../../_photos";
import { badRequest, forbidden, jsonResponse, logWorkerError, unauthorized, unavailable } from "../../../_responses";
import { logAuditEvent } from "../../../lib/audit-log";
import type { PhotoStyle } from "../../../../src/types/photo";

type AdminPhotoEnv = Env & {
  ADMIN_PASSWORD?: string;
};

const allowedStyles = new Set<PhotoStyle>(["jiangnan", "street", "park", "sweet", "couple", "indoor"]);

export const onRequestPatch: PagesFunction<AdminPhotoEnv> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) {
    return unauthorized();
  }
  if (!isAdminMutationRequest(context.request)) {
    return forbidden("缺少后台操作校验头");
  }

  const id = context.params.id;
  if (typeof id !== "string") {
    return badRequest("无效的作品 ID");
  }

  const body = (await context.request.json().catch(() => ({}))) as {
    title?: string;
    style?: string;
    location?: string;
    featured?: boolean;
    visibility?: string;
  };

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.title !== undefined && body.title.trim()) {
    updates.push("title = ?");
    values.push(body.title.trim());
  }
  if (body.style !== undefined && allowedStyles.has(body.style as PhotoStyle)) {
    updates.push("style = ?");
    values.push(body.style);
  }
  if (body.location !== undefined && body.location.trim()) {
    updates.push("location = ?");
    values.push(body.location.trim());
  }
  if (body.featured !== undefined) {
    updates.push("featured = ?");
    values.push(body.featured ? 1 : 0);
  }
  if (body.visibility !== undefined && (body.visibility === "public" || body.visibility === "hidden")) {
    updates.push("visibility = ?");
    values.push(body.visibility);
  }

  if (updates.length === 0) {
    return badRequest("没有可更新的字段");
  }

  values.push(id);
  try {
    // Fetch old values for audit diff
    const oldPhoto = await context.env.DB.prepare(
      "SELECT title, style, location, featured, visibility FROM photos WHERE id = ?"
    ).bind(id).first<Record<string, unknown>>();

    await context.env.DB.prepare(
      `update photos set ${updates.join(", ")} where id = ?`,
    )
      .bind(...values)
      .run();

    // Build diff and log audit event
    const newValues: Record<string, unknown> = {};
    if (body.title !== undefined) newValues.title = body.title.trim();
    if (body.style !== undefined) newValues.style = body.style;
    if (body.location !== undefined) newValues.location = body.location.trim();
    if (body.featured !== undefined) newValues.featured = body.featured;
    if (body.visibility !== undefined) newValues.visibility = body.visibility;

    const diff = oldPhoto
      ? Object.fromEntries(
          Object.entries(newValues).filter(([k]) => oldPhoto[k] !== undefined && oldPhoto[k] !== newValues[k])
        )
      : newValues;

    await logAuditEvent(context, {
      action: "update",
      entity_type: "photo",
      entity_id: String(id),
      diff_json: JSON.stringify(diff),
    });

    if (context.env.CACHE) {
      context.waitUntil(context.env.CACHE.delete("photos:public").catch((error) => {
        logWorkerError("作品缓存失效失败", error, { route: "/api/admin/photos/:id", method: "PATCH" });
      }));
    }
    return jsonResponse({ ok: true });
  } catch (error) {
    return unavailable("保存失败，请稍后重试。", error, { route: "/api/admin/photos/:id", method: "PATCH" });
  }
};

export const onRequestDelete: PagesFunction<AdminPhotoEnv> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) {
    return unauthorized();
  }
  if (!isAdminMutationRequest(context.request)) {
    return forbidden("缺少后台操作校验头");
  }

  const id = context.params.id;
  if (typeof id !== "string") {
    return badRequest("无效的作品 ID");
  }

  try {
    // Fetch photo details for audit log before deletion
    const photo = await context.env.DB.prepare(
      "SELECT title, style FROM photos WHERE id = ?"
    ).bind(id).first<{ title: string; style: string }>();

    const result = await deletePhotoWithConsistency(context.env, id);
    if (!result.ok) {
      return jsonResponse({ error: result.error }, result.status);
    }

    await logAuditEvent(context, {
      action: "delete",
      entity_type: "photo",
      entity_id: String(id),
      diff_json: JSON.stringify({ title: photo?.title, style: photo?.style }),
    });

    context.waitUntil(flushQueuedPhotoObjectDeletes(context.env).catch((error) => {
      logWorkerError("照片 R2 清理队列冲刷失败", error, { route: "/api/admin/photos/:id", method: "DELETE" });
    }));
    if (context.env.CACHE) {
      context.waitUntil(context.env.CACHE.delete("photos:public").catch((error) => {
        logWorkerError("作品缓存失效失败", error, { route: "/api/admin/photos/:id", method: "DELETE" });
      }));
    }
    return jsonResponse({ ok: true, cleanupQueued: result.cleanupQueued });
  } catch (error) {
    return unavailable("删除失败，请稍后重试。", error, { route: "/api/admin/photos/:id", method: "DELETE" });
  }
};
