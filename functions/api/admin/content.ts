import { isAdminRequest } from "../../_auth";
import {
  contentKeys,
  defaultSiteContent,
  mergeSiteContent,
  validateContentPatch,
} from "../../../src/data/content";
import type { PartialSiteContent } from "../../../src/types/content";
import { badRequest, jsonResponse, unauthorized, unavailable } from "../../_responses";

type AdminContentEnv = Env & {
  ADMIN_PASSWORD?: string;
};

type ContentRow = {
  key: string;
  value_json: string;
};

export const onRequestGet: PagesFunction<AdminContentEnv> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) {
    return unauthorized();
  }

  try {
    const rows = await context.env.DB.prepare(
      `select key, value_json
       from cms_content
       where key in (${contentKeys.map(() => "?").join(", ")})`,
    )
      .bind(...contentKeys)
      .all<ContentRow>();

    return jsonResponse({ content: mergeSiteContent(rowsToContent(rows.results)), storageReady: true });
  } catch {
    return jsonResponse({ content: defaultSiteContent, storageReady: false });
  }
};

export const onRequestPatch: PagesFunction<AdminContentEnv> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) {
    return unauthorized();
  }

  const body = (await context.request.json().catch(() => ({}))) as {
    key?: string;
    value?: unknown;
  };

  const validated = validateContentPatch(String(body.key ?? ""), body.value);
  if (validated.ok === false) {
    return badRequest(validated.error);
  }

  const updatedAt = new Date().toISOString();
  try {
    await context.env.DB.prepare(
      `insert into cms_content (key, value_json, updated_at)
       values (?, ?, ?)
       on conflict(key) do update set
         value_json = excluded.value_json,
         updated_at = excluded.updated_at`,
    )
      .bind(body.key, JSON.stringify(validated.value), updatedAt)
      .run();

    return jsonResponse({ ok: true, updatedAt });
  } catch (error) {
    return unavailable("保存失败，请稍后重试。", error, { route: "/api/admin/content", method: "PATCH" });
  }
};

function rowsToContent(rows: ContentRow[]): PartialSiteContent {
  const content: Record<string, unknown> = {};

  for (const row of rows) {
    if (!contentKeys.includes(row.key as never)) continue;
    try {
      content[row.key] = JSON.parse(row.value_json);
    } catch {
      // Ignore malformed rows and let defaults cover the missing section.
    }
  }

  return content as PartialSiteContent;
}
