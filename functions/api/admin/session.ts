import { clearSessionCookie, isAdminRequest } from "../../_auth";

type Env = {
  ADMIN_PASSWORD?: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const authenticated = await isAdminRequest(context.request, context.env);
  return json({ authenticated });
};

export const onRequestDelete: PagesFunction<Env> = async () => {
  return json(
    { ok: true },
    200,
    {
      "set-cookie": clearSessionCookie(),
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
