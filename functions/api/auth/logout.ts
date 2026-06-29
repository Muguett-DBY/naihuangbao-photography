import { jsonResponse } from "../../_responses";
import { clearUserSessionCookie } from "../../_auth";
import { requirePublicMutationRequest } from "../../_security";

export const onRequestPost: PagesFunction = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  return jsonResponse(
    { ok: true },
    200,
    { "set-cookie": clearUserSessionCookie() },
  );
};
