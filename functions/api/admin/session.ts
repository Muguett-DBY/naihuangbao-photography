import { clearSessionCookie, isAdminRequest } from "../../_auth";
import { jsonResponse } from "../../_responses";

type AdminSessionEnv = Env & {
  ADMIN_PASSWORD?: string;
};

export const onRequestGet: PagesFunction<AdminSessionEnv> = async (context) => {
  const authenticated = await isAdminRequest(context.request, context.env);
  return jsonResponse({ authenticated });
};

export const onRequestDelete: PagesFunction<AdminSessionEnv> = async () => {
  return jsonResponse(
    { ok: true },
    200,
    {
      "set-cookie": clearSessionCookie(),
    },
  );
};
