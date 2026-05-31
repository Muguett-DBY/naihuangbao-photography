import { describe, expect, it, vi } from "vitest";
import { onRequestPost as uploadPhoto } from "./api/admin/photos";
import { onRequestDelete as deletePhoto } from "./api/admin/photos/[id]";
import { onRequestGet as getPublicPhotos } from "./api/photos";

function jsonRequest(url: string, init?: RequestInit) {
  return new Request(url, init);
}

function formRequest(fields: Record<string, string | File>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }

  return new Request("https://shoot.custard.top/api/admin/photos", {
    method: "POST",
    body: form,
    headers: { "cf-access-authenticated-user-email": "admin@example.com", "x-nhb-admin-action": "1" },
  });
}

const adminEnv = { ADMIN_PASSWORD: "secret", CF_ACCESS_ADMIN_EMAILS: "admin@example.com" };

function createDb(overrides: {
  all?: () => Promise<{ results: unknown[] }>;
  run?: () => Promise<unknown>;
  first?: () => Promise<unknown>;
} = {}) {
  const statement = {
    bind: vi.fn(() => statement),
    all: vi.fn(overrides.all ?? (async () => ({ results: [] }))),
    run: vi.fn(overrides.run ?? (async () => ({ success: true }))),
    first: vi.fn(overrides.first ?? (async () => null)),
  };

  return {
    statement,
    prepare: vi.fn(() => statement),
  };
}

function createBucket() {
  return {
    put: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
    get: vi.fn(async () => null),
  };
}

describe("Cloudflare Pages API behavior", () => {
  it("returns a static public photo fallback when D1 is unavailable", async () => {
    const db = createDb({
      all: async () => {
        throw new Error("d1 unavailable");
      },
    });

    const response = await getPublicPhotos({
      request: jsonRequest("https://shoot.custard.top/api/photos"),
      env: { DB: db },
    } as never);
    const body = (await response.json()) as { photos?: unknown[]; source?: string };

    expect(response.status).toBe(200);
    expect(body.source).toBe("defaults");
    expect(body.photos?.length).toBeGreaterThan(0);
  });

  it("deletes an uploaded R2 object when the D1 insert fails", async () => {
    const db = createDb({
      run: async () => {
        throw new Error("insert failed");
      },
    });
    const bucket = createBucket();
    const file = new File([new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])], "photo.webp", { type: "image/webp" });

    const response = await uploadPhoto({
      request: formRequest({
        photo: file,
        title: "测试作品",
        style: "jiangnan",
        location: "南京",
        featured: "true",
        clientAuthorized: "true",
      }),
      env: { DB: db, PHOTO_BUCKET: bucket, ...adminEnv },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(body.error).toContain("上传失败");
    expect(bucket.put).toHaveBeenCalledTimes(1);
    expect(bucket.delete).toHaveBeenCalledTimes(1);
  });

  it("keeps the D1 photo row when R2 deletion fails", async () => {
    const db = createDb({
      first: async () => ({ object_key: "gallery/photo.webp" }),
    });
    const bucket = createBucket();
    bucket.delete.mockRejectedValueOnce(new Error("r2 failed"));

    const response = await deletePhoto({
      request: jsonRequest("https://shoot.custard.top/api/admin/photos/photo-id", {
        method: "DELETE",
        headers: { "cf-access-authenticated-user-email": "admin@example.com", "x-nhb-admin-action": "1" },
      }),
      env: { DB: db, PHOTO_BUCKET: bucket, ...adminEnv },
      params: { id: "photo-id" },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(body.error).toContain("删除失败");
    expect(db.statement.run).not.toHaveBeenCalled();
  });
});
