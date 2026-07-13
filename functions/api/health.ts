import { jsonResponse } from "../_responses";
import { getRequiredAuthSecret, getRequiredRateLimitSecret } from "../_security";

type HealthEnv = Env & {
  AUTH_SECRET?: string;
  RATE_LIMIT_SECRET?: string;
  CHAT_RATE_LIMIT_SECRET?: string;
};

const service = "naihuangbao-photography";
const headers = { "cache-control": "no-store" };

export const onRequestGet: PagesFunction<HealthEnv> = async (context) => {
  const checks = {
    ...(!getRequiredAuthSecret(context.env) && { auth: "misconfigured" }),
    ...(!getRequiredRateLimitSecret(context.env) && { rateLimit: "misconfigured" }),
  };

  if (Object.keys(checks).length > 0) {
    return jsonResponse({
      ok: false,
      status: "degraded",
      service,
      checks,
    }, 503, headers);
  }

  return jsonResponse({
    ok: true,
    status: "healthy",
    service,
  }, 200, headers);
};
