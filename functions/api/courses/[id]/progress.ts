import { getUserFromRequest } from "../../../_auth";
import { badRequest, forbidden, jsonResponse, unauthorized, unavailable } from "../../../_responses";
import { getRequiredAuthSecret, requirePublicMutationRequest } from "../../../_security";

type AuthEnv = Env & { AUTH_SECRET?: string };

type CourseRow = {
  id: string;
  price_cents: number;
};

type ProgressRow = {
  completed_modules: string;
};

export const onRequestGet: PagesFunction<AuthEnv> = async (context) => {
  const auth = await authenticate(context);
  if (auth instanceof Response) return auth;

  const id = (context.params as Record<string, string>).id;
  try {
    const accessError = await requireCourseAccess(context.env.DB, id, auth.userId);
    if (accessError) return accessError;

    const row = await context.env.DB.prepare(
      `select completed_modules from course_progress where user_id = ? and course_id = ?`,
    ).bind(auth.userId, id).first<ProgressRow>();

    return jsonResponse({ completedModules: parseCompletedModules(row?.completed_modules) });
  } catch (error) {
    return unavailable("加载课程进度失败", error, { route: `/api/courses/${id}/progress` });
  }
};

export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  const publicActionError = requirePublicMutationRequest(context.request);
  if (publicActionError) return publicActionError;

  const auth = await authenticate(context);
  if (auth instanceof Response) return auth;

  const id = (context.params as Record<string, string>).id;
  const body = (await context.request.json().catch(() => ({}))) as { completedModules?: unknown };
  const completedModules = validateCompletedModules(body.completedModules);
  if (!completedModules) {
    return badRequest("课程进度格式不正确");
  }

  try {
    const accessError = await requireCourseAccess(context.env.DB, id, auth.userId);
    if (accessError) return accessError;

    const moduleRows = await context.env.DB.prepare(
      `select id from course_modules where course_id = ? order by sort_order asc`,
    ).bind(id).all<{ id: string }>();
    const validModuleIds = new Set(moduleRows.results.map((module) => module.id));
    if (completedModules.some((moduleId) => !validModuleIds.has(moduleId))) {
      return badRequest("课程模块不存在");
    }

    const progress = validModuleIds.size > 0
      ? Math.round((completedModules.length / validModuleIds.size) * 100)
      : 0;
    const updatedAt = new Date().toISOString();

    await context.env.DB.prepare(
      `insert into course_progress (user_id, course_id, completed_modules, updated_at)
       values (?, ?, ?, ?)
       on conflict(user_id, course_id)
       do update set completed_modules = excluded.completed_modules, updated_at = excluded.updated_at`,
    ).bind(auth.userId, id, JSON.stringify(completedModules), updatedAt).run();

    await context.env.DB.prepare(
      `update course_purchases set progress = ? where user_id = ? and course_id = ?`,
    ).bind(progress, auth.userId, id).run();

    return jsonResponse({ completedModules, progress });
  } catch (error) {
    return unavailable("保存课程进度失败", error, { route: `/api/courses/${id}/progress`, method: "POST" });
  }
};

async function authenticate(context: EventContext<AuthEnv, string, unknown>) {
  const secret = getRequiredAuthSecret(context.env);
  if (!secret) return unauthorized("请先登录");

  const user = await getUserFromRequest(context.request, secret);
  if (!user) return unauthorized("请先登录");

  if (!context.env.DB) {
    return jsonResponse({ error: "数据库未配置" }, 503);
  }

  return user;
}

async function requireCourseAccess(db: D1Database, courseId: string, userId: string) {
  const course = await db.prepare(
    `select id, price_cents from courses where id = ? and published = 1`,
  ).bind(courseId).first<CourseRow>();
  if (!course) return jsonResponse({ error: "课程不存在" }, 404);
  if (!course.price_cents || course.price_cents <= 0) return null;

  const purchase = await db.prepare(
    `select id from course_purchases where course_id = ? and user_id = ?`,
  ).bind(courseId, userId).first<{ id: string }>();
  return purchase ? null : forbidden("购买课程后才能保存进度");
}

function validateCompletedModules(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 200) return null;

  const modules: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const moduleId = item.trim();
    if (!moduleId || moduleId.length > 100) return null;
    if (!modules.includes(moduleId)) modules.push(moduleId);
  }
  return modules;
}

function parseCompletedModules(value?: string): string[] {
  if (!value) return [];
  try {
    return validateCompletedModules(JSON.parse(value)) ?? [];
  } catch {
    return [];
  }
}
