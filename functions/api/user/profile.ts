import { jsonResponse, badRequest, unauthorized, unavailable } from "../../_responses";
import { getUserFromRequest, hashPassword, generateSalt } from "../../_auth";
import { getRequiredAuthSecret, requirePublicMutationRequest, timingSafeEqual } from "../../_security";
import { validateString, validateOptionalString, validateBody } from "../../_validation";

type AuthEnv = Env & { AUTH_SECRET?: string };

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  salt: string;
};

export const onRequestGet: PagesFunction<AuthEnv> = async () => unauthorized("请先登录");

export const onRequestPut: PagesFunction<AuthEnv> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  const secret = getRequiredAuthSecret(context.env);
  if (!secret) return unauthorized("请先登录");

  const user = await getUserFromRequest(context.request, secret);
  if (!user) return unauthorized("请先登录");

  if (!context.env.DB) {
    return jsonResponse({ error: "数据库未配置" }, 503);
  }

  const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;

  // Profile update: displayName
  if (body.displayName !== undefined) {
    const validated = validateBody(body, {
      displayName: (v) => validateString(v, "显示名称", 50),
    });
    if (!validated.valid) return badRequest(validated.error);

    const displayName = String(body.displayName).trim();
    const now = new Date().toISOString();

    try {
      await context.env.DB.prepare(
        `update users set display_name = ?, updated_at = ? where id = ?`,
      ).bind(displayName, now, user.userId).run();

      return jsonResponse({ ok: true, displayName });
    } catch (error) {
      return unavailable("更新失败", error, { route: "/api/user/profile", method: "PUT" });
    }
  }

  // Password change: currentPassword + newPassword
  if (body.currentPassword !== undefined && body.newPassword !== undefined) {
    const validated = validateBody(body, {
      currentPassword: (v) => validateString(v, "当前密码"),
      newPassword: (v) => validateString(v, "新密码", 128),
    });
    if (!validated.valid) return badRequest(validated.error);

    const currentPassword = String(body.currentPassword).trim();
    const newPassword = String(body.newPassword).trim();

    if (newPassword.length < 8) {
      return badRequest("新密码至少需要8个字符");
    }

    try {
      const row = await context.env.DB.prepare(
        `select id, password_hash, salt from users where id = ?`,
      ).bind(user.userId).first<UserRow>();

      if (!row) return unauthorized("用户不存在");

      const currentHash = await hashPassword(currentPassword, row.salt);
      if (!timingSafeEqual(currentHash, row.password_hash)) {
        return badRequest("当前密码不正确");
      }

      const newSalt = generateSalt();
      const newHash = await hashPassword(newPassword, newSalt);
      const now = new Date().toISOString();

      await context.env.DB.prepare(
        `update users set password_hash = ?, salt = ?, updated_at = ? where id = ?`,
      ).bind(newHash, newSalt, now, user.userId).run();

      return jsonResponse({ ok: true });
    } catch (error) {
      return unavailable("密码更新失败", error, { route: "/api/user/profile", method: "PUT" });
    }
  }

  return badRequest("缺少需要更新的字段");
};
