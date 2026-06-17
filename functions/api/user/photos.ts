import { jsonResponse, unauthorized, unavailable } from "../../_responses";
import { getUserFromRequest } from "../../_auth";
import { getRequiredAuthSecret } from "../../_security";

type AuthEnv = Env & { AUTH_SECRET?: string };

type PhotoRow = {
  id: string;
  title: string;
  style: string;
  image_url: string;
  created_at: string;
};

export const onRequestGet: PagesFunction<AuthEnv> = async (context) => {
  const secret = getRequiredAuthSecret(context.env);
  if (!secret) return unauthorized("请先登录");

  const user = await getUserFromRequest(context.request, secret);
  if (!user) return unauthorized("请先登录");

  if (!context.env.DB) {
    return jsonResponse({ photos: [] }, 503);
  }

  try {
    const result = await context.env.DB.prepare(
      `select id, title, style, image_url, created_at
       from photos
       where client_authorized = 1 and visibility = 'public'
       order by created_at desc`,
    ).all<PhotoRow>();

    const photos = result.results.map((row) => ({
      id: row.id,
      title: row.title,
      imageUrl: `/api/photos/${row.id}/image`,
      style: row.style,
      delivered_at: row.created_at,
    }));

    return jsonResponse({ photos });
  } catch (error) {
    return unavailable("加载照片失败", error, { route: "/api/user/photos", method: "GET" });
  }
};
