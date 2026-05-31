import { jsonResponse } from "../../_responses";
import { getUserFromRequest } from "../../_auth";
import { getRequiredAuthSecret } from "../../_security";

type AuthEnv = Env & {
  AUTH_SECRET?: string;
};

export const onRequestGet: PagesFunction<AuthEnv> = async (context) => {
  const secret = getRequiredAuthSecret(context.env);
  if (!secret) {
    return jsonResponse({ authenticated: false });
  }

  const result = await getUserFromRequest(context.request, secret);

  if (!result) {
    return jsonResponse({ authenticated: false });
  }

  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ authenticated: false });
  }

  const user = await db
    .prepare("select id, email, display_name from users where id = ?")
    .bind(result.userId)
    .first<{ id: string; email: string; display_name: string }>();

  if (!user) {
    return jsonResponse({ authenticated: false });
  }

  return jsonResponse({
    authenticated: true,
    user: { id: user.id, email: user.email, displayName: user.display_name },
  });
};
