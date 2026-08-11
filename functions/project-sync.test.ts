import { describe, expect, it, vi } from "vitest";
import { createUserSession } from "./_auth";
import { onRequestPut as putProject } from "./api/projects/sync/[id]";
import { onRequestPut as putAsset } from "./api/projects/sync/assets/[assetId]";
import type { WorkspaceProject } from "../src/types/workspace-project";

const authSecret = "project-sync-test-secret-with-enough-entropy-2026";
const project: WorkspaceProject = {
  id: "sync-project", version: 2, projectType: "workspace", name: "Sync project", description: "Local-first", accent: "#57715e",
  assets: [], vaultAssetIds: [], creativeDocumentIds: [], compositionIds: [], storyIds: [], activeSurface: "vault", status: "active",
  exhibition: { theme: "paper", density: "editorial", motion: "calm", showIndex: true }, createdAt: 1, updatedAt: 2, lastOpenedAt: 2,
};

function createDb(
  current: Record<string, unknown> | null = null,
  assetCurrent: Record<string, unknown> | null = null,
  options: {
    projectCount?: number;
    assetUsage?: { asset_count: number; total_bytes: number };
    versions?: Array<Record<string, unknown>>;
    batchChanges?: number[];
    runChanges?: number;
    assetCurrentAfterWrite?: Record<string, unknown> | null;
  } = {},
) {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  let assetRowReads = 0;
  const db = {
    statements,
    prepare: vi.fn((sql: string) => {
      const statement = {
        sql,
        values: [] as unknown[],
        bind: vi.fn((...values: unknown[]) => { statement.values = values; statements.push({ sql, values }); return statement; }),
        first: vi.fn(async () => {
          if (sql.includes("session_version from users")) return { session_version: 0 };
          if (sql.includes("count(*) as project_count")) return { project_count: options.projectCount ?? 0 };
          if (sql.includes("count(*) as asset_count")) return options.assetUsage ?? { asset_count: 0, total_bytes: 0 };
          if (sql.includes("synced_workspace_projects")) return current;
          if (sql.includes("synced_vault_assets")) {
            const row = assetRowReads === 0 ? assetCurrent : options.assetCurrentAfterWrite ?? assetCurrent;
            assetRowReads += 1;
            return row;
          }
          return null;
        }),
        run: vi.fn(async () => ({ success: true, meta: { changes: options.runChanges ?? 1 } })),
        all: vi.fn(async () => ({ results: sql.includes("workspace_project_versions") ? options.versions ?? [] : [] })),
      };
      return statement;
    }),
    batch: vi.fn(async (queries: unknown[]) => queries.map((_, index) => ({
      success: true,
      meta: { changes: options.batchChanges?.[index] ?? 1 },
    }))),
  };
  return db;
}

async function cookie() {
  return `nhb_user_session=${await createUserSession("sync-user", authSecret)}`;
}

function context(request: Request, db: ReturnType<typeof createDb>, bucket: Record<string, unknown>, params: Record<string, string>) {
  return { request, env: { DB: db, PHOTO_BUCKET: bucket, AUTH_SECRET: authSecret }, params, data: {}, waitUntil: vi.fn(), next: vi.fn(), functionPath: "", passThroughOnException: vi.fn() } as never;
}

describe("workspace project sync Pages Functions", () => {
  it("requires an authenticated user session", async () => {
    const request = new Request("https://shoot.custard.top/api/projects/sync/sync-project", { method: "PUT", headers: { "content-type": "application/json", "x-nhb-public-action": "1" }, body: JSON.stringify({ project, expectedRevision: 0 }) });
    const response = await putProject(context(request, createDb(), { put: vi.fn(), delete: vi.fn() }, { id: project.id }));
    expect(response.status).toBe(401);
  });

  it("writes an immutable R2 revision and a D1 current/version batch", async () => {
    const db = createDb();
    const bucket = { put: vi.fn(async () => undefined), delete: vi.fn(async () => undefined) };
    const request = new Request("https://shoot.custard.top/api/projects/sync/sync-project", { method: "PUT", headers: { "content-type": "application/json", "x-nhb-public-action": "1", cookie: await cookie() }, body: JSON.stringify({ project, expectedRevision: 0 }) });
    const response = await putProject(context(request, db, bucket, { id: project.id }));
    const body = await response.json() as { revision: number; contentHash: string };
    expect(response.status).toBe(200);
    expect(body.revision).toBe(1);
    expect(body.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(bucket.put).toHaveBeenCalledWith(expect.stringMatching(/^workspace-users\/sync-user\/projects\/sync-project\/v1-[0-9a-f-]+\.json$/), expect.any(String), expect.any(Object));
    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(db.statements.some(({ sql }) => sql.includes("project_id <> ?") && sql.includes("synced_workspace_projects.revision = ?"))).toBe(true);
  });

  it("returns a conflict without overwriting a newer cloud revision", async () => {
    const db = createDb({ revision: 3, content_hash: "a".repeat(64), object_key: "existing", updated_at: "2026-08-09T00:00:00.000Z" });
    const bucket = { put: vi.fn(), delete: vi.fn() };
    const request = new Request("https://shoot.custard.top/api/projects/sync/sync-project", { method: "PUT", headers: { "content-type": "application/json", "x-nhb-public-action": "1", cookie: await cookie() }, body: JSON.stringify({ project, expectedRevision: 1 }) });
    const response = await putProject(context(request, db, bucket, { id: project.id }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ conflict: true, remoteRevision: 3 });
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("rejects new projects once the per-user project quota is reached", async () => {
    const db = createDb(null, null, { projectCount: 40 });
    const bucket = { put: vi.fn(), delete: vi.fn() };
    const request = new Request("https://shoot.custard.top/api/projects/sync/sync-project", { method: "PUT", headers: { "content-type": "application/json", "x-nhb-public-action": "1", cookie: await cookie() }, body: JSON.stringify({ project, expectedRevision: 0 }) });

    const response = await putProject(context(request, db, bucket, { id: project.id }));

    expect(response.status).toBe(413);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("atomically rejects a project quota race and removes the unused R2 object", async () => {
    const db = createDb(null, null, { projectCount: 39, batchChanges: [0, 0] });
    const bucket = { put: vi.fn(async () => undefined), delete: vi.fn(async () => undefined) };
    const request = new Request("https://shoot.custard.top/api/projects/sync/sync-project", { method: "PUT", headers: { "content-type": "application/json", "x-nhb-public-action": "1", cookie: await cookie() }, body: JSON.stringify({ project, expectedRevision: 0 }) });

    const response = await putProject(context(request, db, bucket, { id: project.id }));

    expect(response.status).toBe(413);
    expect(bucket.put).toHaveBeenCalledTimes(1);
    expect(bucket.delete).toHaveBeenCalledWith(expect.stringMatching(/^workspace-users\/sync-user\/projects\/sync-project\/v1-/));
  });

  it("prunes the oldest immutable revision while keeping twenty versions", async () => {
    const versions = Array.from({ length: 20 }, (_, index) => {
      const revision = 20 - index;
      return { id: `version-${revision}`, revision, content_hash: String(revision).padStart(64, "0"), object_key: `old-${revision}`, created_at: "2026-08-09T00:00:00.000Z" };
    });
    const db = createDb({ revision: 20, content_hash: "a".repeat(64), object_key: "old-20", updated_at: "2026-08-09T00:00:00.000Z" }, null, { versions });
    const bucket = { put: vi.fn(async () => undefined), delete: vi.fn(async () => undefined) };
    const request = new Request("https://shoot.custard.top/api/projects/sync/sync-project", { method: "PUT", headers: { "content-type": "application/json", "x-nhb-public-action": "1", cookie: await cookie() }, body: JSON.stringify({ project, expectedRevision: 20 }) });

    const response = await putProject(context(request, db, bucket, { id: project.id }));

    expect(response.status).toBe(200);
    expect(db.batch).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ sql: expect.stringContaining("delete from workspace_project_versions") })]));
    expect(bucket.delete).toHaveBeenCalledWith(["old-1"]);
  });

  it("stores eligible image originals and rejects non-image payloads", async () => {
    const db = createDb();
    const bucket = { put: vi.fn(async () => undefined), delete: vi.fn(async () => undefined) };
    const imageRequest = new Request("https://shoot.custard.top/api/projects/sync/assets/asset-1", { method: "PUT", headers: { "content-type": "image/webp", "x-nhb-public-action": "1", cookie: await cookie() }, body: new Uint8Array([1, 2, 3, 4]) });
    const imageResponse = await putAsset(context(imageRequest, db, bucket, { assetId: "asset-1" }));
    expect(imageResponse.status).toBe(200);
    expect(bucket.put).toHaveBeenCalledWith(expect.stringMatching(/^workspace-users\/sync-user\/assets\/asset-1\/[0-9a-f-]+$/), expect.any(ArrayBuffer), expect.any(Object));

    const textRequest = new Request("https://shoot.custard.top/api/projects/sync/assets/asset-2", { method: "PUT", headers: { "content-type": "text/plain", "x-nhb-public-action": "1", cookie: await cookie() }, body: "not an image" });
    const textResponse = await putAsset(context(textRequest, db, bucket, { assetId: "asset-2" }));
    expect(textResponse.status).toBe(400);

    const svgRequest = new Request("https://shoot.custard.top/api/projects/sync/assets/asset-3", { method: "PUT", headers: { "content-type": "image/svg+xml", "x-nhb-public-action": "1", cookie: await cookie() }, body: "<svg/>" });
    const svgResponse = await putAsset(context(svgRequest, db, bucket, { assetId: "asset-3" }));
    expect(svgResponse.status).toBe(400);
  });

  it("rejects new assets before R2 upload when the user storage quota is full", async () => {
    const db = createDb(null, null, { assetUsage: { asset_count: 100, total_bytes: 1024 } });
    const bucket = { put: vi.fn(), delete: vi.fn() };
    const request = new Request("https://shoot.custard.top/api/projects/sync/assets/asset-new", { method: "PUT", headers: { "content-type": "image/webp", "x-nhb-public-action": "1", cookie: await cookie() }, body: new Uint8Array([1, 2, 3, 4]) });

    const response = await putAsset(context(request, db, bucket, { assetId: "asset-new" }));

    expect(response.status).toBe(413);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("atomically rejects an asset quota race and removes the unused R2 object", async () => {
    const db = createDb(null, null, { assetUsage: { asset_count: 99, total_bytes: 1024 }, runChanges: 0 });
    const bucket = { put: vi.fn(async () => undefined), delete: vi.fn(async () => undefined) };
    const request = new Request("https://shoot.custard.top/api/projects/sync/assets/asset-new", { method: "PUT", headers: { "content-type": "image/webp", "x-nhb-public-action": "1", cookie: await cookie() }, body: new Uint8Array([1, 2, 3, 4]) });

    const response = await putAsset(context(request, db, bucket, { assetId: "asset-new" }));

    expect(response.status).toBe(413);
    expect(bucket.put).toHaveBeenCalledTimes(1);
    expect(bucket.delete).toHaveBeenCalledWith(expect.stringMatching(/^workspace-users\/sync-user\/assets\/asset-new\//));
    expect(db.statements.some(({ sql }) => sql.includes("asset_id <> ?"))).toBe(true);
  });

  it("returns a conflict when another device replaces the same asset first", async () => {
    const previous = { object_key: "workspace-users/sync-user/assets/asset-1/old", content_type: "image/webp", size: 3, updated_at: "2026-08-08T00:00:00.000Z" };
    const latest = { ...previous, object_key: "workspace-users/sync-user/assets/asset-1/other-device", updated_at: "2026-08-09T00:00:00.000Z" };
    const db = createDb(null, previous, { assetUsage: { asset_count: 1, total_bytes: 3 }, runChanges: 0, assetCurrentAfterWrite: latest });
    const bucket = { put: vi.fn(async () => undefined), delete: vi.fn(async () => undefined) };
    const request = new Request("https://shoot.custard.top/api/projects/sync/assets/asset-1", { method: "PUT", headers: { "content-type": "image/webp", "x-nhb-public-action": "1", cookie: await cookie() }, body: new Uint8Array([1, 2, 3, 4]) });

    const response = await putAsset(context(request, db, bucket, { assetId: "asset-1" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ conflict: true, updatedAt: latest.updated_at });
    expect(bucket.delete).toHaveBeenCalledWith(expect.stringMatching(/^workspace-users\/sync-user\/assets\/asset-1\/(?!old|other-device)/));
  });

  it("keeps the previous vault object until its replacement is durable", async () => {
    const previousKey = "workspace-users/sync-user/assets/asset-1/previous";
    const db = createDb(null, { object_key: previousKey, content_type: "image/webp", size: 3, updated_at: "2026-08-08T00:00:00.000Z" });
    const bucket = { put: vi.fn(async () => undefined), delete: vi.fn(async () => undefined) };
    const request = new Request("https://shoot.custard.top/api/projects/sync/assets/asset-1", { method: "PUT", headers: { "content-type": "image/webp", "x-nhb-public-action": "1", cookie: await cookie() }, body: new Uint8Array([1, 2, 3, 4]) });
    const response = await putAsset(context(request, db, bucket, { assetId: "asset-1" }));
    expect(response.status).toBe(200);
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("select object_key"));
    expect(bucket.delete).toHaveBeenCalledWith(previousKey);
  });
});
