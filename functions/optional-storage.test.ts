import { describe, expect, it, vi } from "vitest";
import { onRequestGet as image } from "./api/photos/[id]/image";
import { onRequestGet as download } from "./api/photos/[id]/download";
import { onRequestGet as photos } from "./api/photos";

describe("optional storage bindings", () => {
  it.each([image, download])("returns 503 for missing storage before querying photo metadata", async (handler) => {
    const statement = { bind: vi.fn().mockReturnThis(), first: vi.fn(async () => ({ object_key: "gallery/photo.jpg", title: "Photo" })) };
    const db = { prepare: vi.fn(() => statement) };
    const response = await handler({
      request: new Request("https://shoot.custard.top/api/photos/photo/image"),
      params: { id: "photo" }, env: { DB: db },
    } as never) as Response;

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: expect.any(String) });
    expect(db.prepare).not.toHaveBeenCalled();
  });

  it("serves the D1 photo list without KV", async () => {
    const statement = { all: vi.fn(async () => ({ results: [] })) };
    const db = { prepare: vi.fn(() => statement) };
    const waitUntil = vi.fn();
    const response = await photos({
      request: new Request("https://shoot.custard.top/api/photos"),
      params: {}, env: { DB: db }, waitUntil,
    } as never) as Response;

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ photos: [], source: "remote" });
    expect(response.headers.get("x-cache")).toBe("d1");
    expect(waitUntil).not.toHaveBeenCalled();
  });
});
