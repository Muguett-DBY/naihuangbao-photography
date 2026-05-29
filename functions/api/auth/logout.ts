import { jsonResponse } from "../../_responses";
import { clearUserSessionCookie } from "../../_auth";

export const onRequestPost: PagesFunction = async () => {
  return jsonResponse(
    { ok: true },
    200,
    { "set-cookie": clearUserSessionCookie() },
  );
};
