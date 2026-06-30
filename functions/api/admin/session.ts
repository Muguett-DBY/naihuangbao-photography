import { clearSessionCookie, isAdminMutationRequest, isAdminRequest } from "../../_auth";
import { forbidden, jsonResponse } from "../../_responses";

type AdminSessionEnv = Env & {
  ADMIN_PASSWORD?: string;
};

export const onRequestGet: PagesFunction<AdminSessionEnv> = async (context) => {
  const authenticated = await isAdminRequest(context.request, context.env);
  return jsonResponse({ authenticated });
};

export const onRequestDelete: PagesFunction<AdminSessionEnv> = async (context) => {
  if (!isAdminMutationRequest(context.request)) {
    return forbidden("缺少后台操作校验头");
  }

  return jsonResponse(
    { ok: true },
    200,
    {
      "set-cookie": clearSessionCookie(),
    },
  );
};
