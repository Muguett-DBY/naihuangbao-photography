import { isAdminMutationRequest, isAdminRequest } from "../../_auth";
import { jsonResponse, badRequest, forbidden, unauthorized, unavailable } from "../../_responses";
import { validateString, validateOptionalString, validateOptionalInt, validateEnum, validateOptionalEnum, validateUrl, validateBody } from "../../_validation";

type AdminEnv = Env & { ADMIN_PASSWORD?: string };

const courseCategories = ["beginner", "intermediate", "advanced", "lightroom", "posing", "business"] as const;
const courseDifficulties = ["beginner", "intermediate", "advanced"] as const;

// ── GET /api/admin/courses ──
export const onRequestGet: PagesFunction<AdminEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) {
    return unauthorized();
  }

  try {
    const result = await context.env.DB.prepare(
      `select * from courses order by sort_order asc, created_at desc`,
    ).all();
    return jsonResponse({ courses: result.results });
  } catch (error) {
    return unavailable("加载失败", error, { route: "/api/admin/courses" });
  }
};

// ── POST /api/admin/courses ──
export const onRequestPost: PagesFunction<AdminEnv> = async (context) => {
  if (!(await isAdminRequest(context.request, context.env))) {
    return unauthorized();
  }
  if (!isAdminMutationRequest(context.request)) {
    return forbidden("缺少后台操作校验头");
  }

  const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;

  const validated = validateBody(body, {
    title: (v) => validateString(v, "课程标题"),
    title_en: (v) => validateOptionalString(v, "英文标题"),
    title_ko: (v) => validateOptionalString(v, "韩文标题"),
    title_ja: (v) => validateOptionalString(v, "日文标题"),
    description: (v) => validateOptionalString(v, "描述"),
    category: (v) => validateOptionalEnum(v, "分类", courseCategories),
    difficulty: (v) => validateOptionalEnum(v, "难度", courseDifficulties),
    duration_minutes: (v) => validateOptionalInt(v, "时长(分钟)", 0),
    sort_order: (v) => validateOptionalInt(v, "排序", 0),
    cover_image_url: (v) => validateUrl(v, "封面图片"),
    video_url: (v) => validateUrl(v, "视频"),
  });

  if (!validated.valid) {
    return badRequest(validated.error);
  }
  const title = (body.title as string)?.trim();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await context.env.DB.prepare(
      `insert into courses (id, title, title_en, title_ko, title_ja, description, description_en, description_ko, description_ja,
         cover_image_url, video_url, content_markdown, category, difficulty, duration_minutes, sort_order, published, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id, title, body.title_en ?? "", body.title_ko ?? "", body.title_ja ?? "",
      body.description ?? "", body.description_en ?? "", body.description_ko ?? "", body.description_ja ?? "",
      body.cover_image_url ?? "", body.video_url ?? "", body.content_markdown ?? "",
      body.category ?? "beginner", body.difficulty ?? "beginner", body.duration_minutes ?? 0,
      body.sort_order ?? 0, body.published ?? 0, now, now,
    ).run();

    return jsonResponse({ ok: true, id }, 201);
  } catch (error) {
    return unavailable("创建失败", error, { route: "/api/admin/courses", method: "POST" });
  }
};
