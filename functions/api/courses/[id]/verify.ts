import { badRequest, jsonResponse } from "../../../_responses";
import { enforceRateLimit, rateLimited, requirePublicMutationRequest } from "../../../_security";

type VerifyBody = { password?: string };

export const onRequestPost: PagesFunction<Env & { COURSE_PASSWORDS?: string }> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  const limit = await enforceRateLimit(context.request, context.env, "course-password", 10, 60 * 15);
  if (!limit.ok) return rateLimited(limit.retryAfter);

  try {
    const body = await context.request.json() as VerifyBody;
    if (!body.password) {
      return badRequest("密码不能为空");
    }

    const raw = context.env.COURSE_PASSWORDS || "";
    const validPasswords = raw.split(",").map((s: string) => s.trim()).filter(Boolean);
    const verified = validPasswords.length === 0 || validPasswords.includes(body.password);

    return jsonResponse({ verified }, 200);
  } catch (error) {
    console.error("[courses/verify]", error);
    return badRequest("请求格式错误");
  }
};
