import { isAdminRequest } from "../../_auth";
import { createPhotoWithCompensation, mapPublicPhoto, type PhotoRow } from "../../_photos";
import { badRequest, jsonResponse, unauthorized, unavailable } from "../../_responses";
import type { PhotoStyle } from "../../../src/types/photo";

type AdminPhotosEnv = Env & {
  ADMIN_PASSWORD?: string;
};

const allowedStyles = new Set<PhotoStyle>(["jiangnan", "street", "park", "sweet", "couple", "indoor"]);
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const onRequestGet: PagesFunction<AdminPhotosEnv> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) {
    return unauthorized();
  }

  try {
    const result = await context.env.DB.prepare(
      `select id, title, style, location, image_url, alt, featured, client_authorized, visibility, created_at
       from photos
       order by created_at desc`,
    ).all<PhotoRow>();

    const photos = result.results.map((row) => ({
      ...mapPublicPhoto(row),
      createdAt: row.created_at,
    }));

    return jsonResponse({ photos });
  } catch (error) {
    return unavailable("作品加载失败，请稍后重试。", error, { route: "/api/admin/photos", method: "GET" });
  }
};

export const onRequestPost: PagesFunction<AdminPhotosEnv> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) {
    return unauthorized();
  }

  const formData = await context.request.formData();
  const photo = formData.get("photo");
  const title = String(formData.get("title") ?? "").trim();
  const style = String(formData.get("style") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const featured = formData.get("featured") === "true";
  const clientAuthorized = formData.get("clientAuthorized") === "true";

  if (!photo || typeof photo === "string") {
    return badRequest("缺少照片文件");
  }

  const photoFile = photo;

  if (!allowedTypes.has(photoFile.type)) {
    return badRequest("只支持 JPEG、PNG 或 WebP 图片");
  }

  const maxSize = 10 * 1024 * 1024;
  if (photoFile.size > maxSize) {
    return badRequest("图片过大，请上传小于 10MB 的文件");
  }

  if (!title || !location || !isAllowedStyle(style)) {
    return badRequest("标题、地点或风格分类不完整");
  }

  if (!clientAuthorized) {
    return badRequest("未确认客人授权，不能公开上传");
  }

  const extension = extensionFor(photoFile.type);
  const id = crypto.randomUUID();
  const objectKey = `gallery/${id}.${extension}`;
  const imageUrl = `/api/photos/${id}/image`;

  try {
    await createPhotoWithCompensation(context.env, {
      id,
      title,
      style,
      location,
      file: photoFile,
      objectKey,
      imageUrl,
      featured,
    });

    // Invalidate list cache
    context.waitUntil(context.env.CACHE?.delete("photos:public").catch(() => {}));

    return jsonResponse({ id, imageUrl }, 201);
  } catch (error) {
    return unavailable("上传失败，请稍后重试。", error, { route: "/api/admin/photos", method: "POST" });
  }
};

function isAllowedStyle(style: string): style is PhotoStyle {
  return allowedStyles.has(style as PhotoStyle);
}

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}
