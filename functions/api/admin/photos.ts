import { isAdminRequest } from "../../_auth";

type Env = {
  PHOTO_BUCKET: R2Bucket;
  DB: D1Database;
  ADMIN_PASSWORD?: string;
};

const allowedStyles = new Set(["jiangnan", "street", "park", "sweet", "couple", "indoor"]);
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) {
    return json({ error: "请先登录后台" }, 401);
  }

  const formData = await context.request.formData();
  const photo = formData.get("photo");
  const title = String(formData.get("title") ?? "").trim();
  const style = String(formData.get("style") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const featured = formData.get("featured") === "true";
  const clientAuthorized = formData.get("clientAuthorized") === "true";

  if (!photo || typeof photo === "string") {
    return json({ error: "缺少照片文件" }, 400);
  }

  const photoFile = photo as unknown as File;

  if (!allowedTypes.has(photoFile.type)) {
    return json({ error: "只支持 JPEG、PNG 或 WebP 图片" }, 400);
  }

  if (!title || !location || !allowedStyles.has(style)) {
    return json({ error: "标题、地点或风格分类不完整" }, 400);
  }

  if (!clientAuthorized) {
    return json({ error: "未确认客人授权，不能公开上传" }, 400);
  }

  const extension = extensionFor(photoFile.type);
  const id = crypto.randomUUID();
  const objectKey = `gallery/${id}.${extension}`;
  await context.env.PHOTO_BUCKET.put(objectKey, photoFile.stream(), {
    httpMetadata: { contentType: photoFile.type },
    customMetadata: { title, style, location, clientAuthorized: "true" },
  });

  const imageUrl = `/api/photos/${id}/image`;

  await context.env.DB.prepare(
    `insert into photos
      (id, title, style, location, object_key, image_url, alt, featured, client_authorized, visibility, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  )
    .bind(
      id,
      title,
      style,
      location,
      objectKey,
      imageUrl,
      `${location}${title}摄影作品`,
      featured ? 1 : 0,
      1,
      "public",
    )
    .run();

  return json({ id, imageUrl }, 201);
};

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
