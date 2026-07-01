import { isAdminMutationRequest, isAdminRequest } from "../../_auth";
import { buildPhotoSelectList, createPhotoWithCompensation, mapPublicPhoto, type PhotoRow } from "../../_photos";
import { badRequest, forbidden, jsonResponse, unauthorized, unavailable } from "../../_responses";
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
    const columns = await buildPhotoSelectList(context.env, [
      "id",
      "title",
      "style",
      "location",
      "image_url",
      "alt",
      "featured",
      "client_authorized",
      "visibility",
      "created_at",
    ]);
    const result = await context.env.DB.prepare(
      `select ${columns}
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
  if (!isAdminMutationRequest(context.request)) {
    return forbidden("缺少后台操作校验头");
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

  if (!(await hasExpectedImageSignature(photoFile))) {
    return badRequest("图片文件内容与格式不匹配");
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
  const alt = `${location}${title}摄影作品`;

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

    if (context.env.CACHE) {
      context.waitUntil(context.env.CACHE.delete("photos:public").catch(() => {}));
    }

    return jsonResponse({
      photo: {
        id,
        title,
        style,
        location,
        imageUrl,
        alt,
        featured,
        clientAuthorized: true,
        visibility: "public",
        createdAt: new Date().toISOString(),
      },
    }, 201);
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

async function hasExpectedImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.type === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (file.type === "image/webp") {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}
