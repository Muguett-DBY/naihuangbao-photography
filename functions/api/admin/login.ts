import { createAdminSession, sessionCookie } from "../../_auth";

type Env = {
  ADMIN_PASSWORD?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = (await context.request.json().catch(() => ({}))) as {
    password?: string;
  };

  if (!context.env.ADMIN_PASSWORD) {
    return json({ error: "后台密码未配置" }, 500);
  }

  if (!body.password || body.password !== context.env.ADMIN_PASSWORD) {
    return json({ error: "密码不正确" }, 401);
  }

  const session = await createAdminSession(context.env);
  return json(
    { ok: true },
    200,
    {
      "set-cookie": sessionCookie(session),
    },
  );
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}
