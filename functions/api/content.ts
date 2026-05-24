import { contentKeys, defaultSiteContent, mergeSiteContent } from "../../src/data/content";
import type { PartialSiteContent } from "../../src/types/content";
import { jsonResponse, logWorkerError } from "../_responses";

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

    return jsonResponse({ content: mergeSiteContent(rowsToContent(rows.results)), source: "remote" });
  } catch (error) {
    logWorkerError("Public content fallback", error, { route: "/api/content" });
    return jsonResponse({ content: defaultSiteContent, source: "defaults" });
  }
};

function rowsToContent(rows: ContentRow[]): PartialSiteContent {
  const content: Record<string, unknown> = {};

  for (const row of rows) {
    if (!contentKeys.includes(row.key as never)) continue;
    try {
      content[row.key] = JSON.parse(row.value_json);
    } catch (error) {
      console.warn("Content API: malformed row", row.key, error);
    }
  }

  return content as PartialSiteContent;
}
