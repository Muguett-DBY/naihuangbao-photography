import { jsonResponse, unavailable } from "../../_responses";
import { requireProjectSyncUser, type ProjectSyncEnv } from "../../_project-sync";

type SyncedProjectRow = { project_id: string; revision: number; content_hash: string; updated_at: string };

export const onRequestGet: PagesFunction<ProjectSyncEnv> = async (context) => {
  const auth = await requireProjectSyncUser(context.request, context.env);
  if (!auth.ok) return auth.response;
  try {
    const rows = await context.env.DB.prepare(
      `select project_id, revision, content_hash, updated_at
       from synced_workspace_projects where user_id = ? order by updated_at desc limit 100`,
    ).bind(auth.userId).all<SyncedProjectRow>();
    return jsonResponse({ projects: rows.results.map((row) => ({ projectId: row.project_id, revision: row.revision, contentHash: row.content_hash, updatedAt: row.updated_at })) }, 200, { "cache-control": "no-store" });
  } catch (error) {
    return unavailable("Failed to list synced projects", error, { route: "/api/projects/sync", method: "GET" });
  }
};
