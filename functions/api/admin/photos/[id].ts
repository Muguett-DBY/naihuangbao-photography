import { isAdminRequest } from "../../../_auth";

type Env = {
  PHOTO_BUCKET: R2Bucket;
  DB: D1Database;
  ADMIN_PASSWORD?: string;
};

const allowedStyles = new Set(["jiangnan", "street", "park", "sweet", "couple", "indoor"]);

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) {
    return json({ error: "请先登录后台" }, 401);
  }

  const id = context.params.id;
  if (typeof id !== "string") {
    return json({ error: "无效的作品 ID" }, 400);
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
  if (body.style !== undefined && allowedStyles.has(body.style)) {
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
    return json({ error: "没有可更新的字段" }, 400);
  }

  values.push(id);
  await context.env.DB.prepare(
    `update photos set ${updates.join(", ")} where id = ?`,
  )
    .bind(...values)
    .run();

  return json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) {
    return json({ error: "请先登录后台" }, 401);
  }

  const id = context.params.id;
  if (typeof id !== "string") {
    return json({ error: "无效的作品 ID" }, 400);
  }

  const row = await context.env.DB.prepare(
    "select object_key from photos where id = ?",
  )
    .bind(id)
    .first<{ object_key: string }>();

  if (!row) {
    return json({ error: "作品不存在" }, 404);
  }

  try {
    await context.env.PHOTO_BUCKET.delete(row.object_key);
  } catch {
    // R2 删除失败不阻塞 D1 删除
  }

  await context.env.DB.prepare("delete from photos where id = ?").bind(id).run();

  return json({ ok: true });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
