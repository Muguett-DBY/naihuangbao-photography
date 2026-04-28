import { describe, expect, it } from "vitest";
import { createAdminSession, isAdminRequest } from "../../functions/_auth";

describe("admin session cookies", () => {
  it("accepts a valid session when a stale cookie with the same name appears first", async () => {
    const env = { ADMIN_PASSWORD: "secret-password" };
    const validSession = await createAdminSession(env);
    const request = new Request("https://shoot.custard.top/api/admin/session", {
      headers: {
        cookie: `nhb_admin_session=stale.invalid; nhb_admin_session=${validSession}`,
      },
    });

    await expect(isAdminRequest(request, env)).resolves.toBe(true);
  });
});
