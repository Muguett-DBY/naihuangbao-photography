import { jsonResponse, unauthorized, unavailable } from "../../_responses";
import { getUserFromRequest } from "../../_auth";
import { getRequiredAuthSecret } from "../../_security";

type AuthEnv = Env & { AUTH_SECRET?: string };

type PurchaseRow = {
  id: string;
  item_type: string;
  item_id: string;
  item_name: string;
  price_cents: number;
  created_at: string;
};

export const onRequestGet: PagesFunction<AuthEnv> = async (context) => {
  const secret = getRequiredAuthSecret(context.env);
  if (!secret) return unauthorized("请先登录");

  const user = await getUserFromRequest(context.request, secret);
  if (!user) return unauthorized("请先登录");

  if (!context.env.DB) {
    return jsonResponse({ purchases: [] }, 503);
  }

  try {
    const result = await context.env.DB.prepare(
      `select id, item_type, item_id, item_name, price_cents, created_at
       from purchases
       where user_id = ?
       order by created_at desc`,
    )
      .bind(user.userId)
      .all<PurchaseRow>();

    return jsonResponse({ purchases: result.results });
  } catch {
    return jsonResponse({ purchases: [] });
  }
};
