import { contentKeys, defaultSiteContent, mergeSiteContent } from "../../src/data/content";
import type { PartialSiteContent } from "../../src/types/content";

type Env = {
  DB: D1Database;
};

type ContentRow = {
  key: string;
  value_json: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const rows = await context.env.DB.prepare(
      `select key, value_json
       from cms_content
       where key in (${contentKeys.map(() => "?").join(", ")})`,
    )
      .bind(...contentKeys)
      .all<ContentRow>();

    return json({ content: mergeSiteContent(rowsToContent(rows.results)) });
  } catch {
    return json({ content: defaultSiteContent, source: "defaults" });
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
