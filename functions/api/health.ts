import { jsonResponse } from "../_responses";
import { getRequiredAuthSecret } from "../_security";

type HealthEnv = Env & { AUTH_SECRET?: string };

const service = "naihuangbao-photography";
const headers = { "cache-control": "no-store" };

export const onRequestGet: PagesFunction<HealthEnv> = async (context) => {
  if (!getRequiredAuthSecret(context.env)) {
    return jsonResponse({
      ok: false,
      status: "degraded",
      service,
      checks: { auth: "misconfigured" },
    }, 503, headers);
  }

  return jsonResponse({
    ok: true,
    status: "healthy",
    service,
  }, 200, headers);
};
