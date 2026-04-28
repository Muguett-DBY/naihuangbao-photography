import { isAdminRequest } from "../../_auth";
import {
  contentKeys,
  defaultSiteContent,
  mergeSiteContent,
  validateContentPatch,
} from "../../../src/data/content";
import type { PartialSiteContent } from "../../../src/types/content";

type Env = {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
};

type ContentRow = {
  key: string;
  value_json: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) {
    return json({ error: "请先登录后台" }, 401);
  }

  try {
    const rows = await context.env.DB.prepare(
      `select key, value_json
       from cms_content
       where key in (${contentKeys.map(() => "?").join(", ")})`,
    )
      .bind(...contentKeys)
      .all<ContentRow>();

    return json({ content: mergeSiteContent(rowsToContent(rows.results)), storageReady: true });
  } catch {
    return json({ content: defaultSiteContent, storageReady: false });
  }
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const isAdmin = await isAdminRequest(context.request, context.env);
  if (!isAdmin) {
    return json({ error: "请先登录后台" }, 401);
  }

  const body = (await context.request.json().catch(() => ({}))) as {
    key?: string;
    value?: unknown;
  };

  const validated = validateContentPatch(String(body.key ?? ""), body.value);
  if (validated.ok === false) {
    return json({ error: validated.error }, 400);
  }

  const updatedAt = new Date().toISOString();
  await context.env.DB.prepare(
    `insert into cms_content (key, value_json, updated_at)
     values (?, ?, ?)
     on conflict(key) do update set
       value_json = excluded.value_json,
       updated_at = excluded.updated_at`,
  )
    .bind(body.key, JSON.stringify(validated.value), updatedAt)
    .run();

  return json({ ok: true, updatedAt });
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
