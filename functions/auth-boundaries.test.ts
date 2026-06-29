import { describe, expect, it } from "vitest";
import { onRequestPost as forgotPassword } from "./api/auth/forgot-password";
import { onRequestPost as login } from "./api/auth/login";
import { onRequestPost as logout } from "./api/auth/logout";
import { onRequestPost as register } from "./api/auth/register";
import { onRequestPost as resetPassword } from "./api/auth/reset-password";

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("public auth mutation boundaries", () => {
  it.each([
    ["login", login, "/api/auth/login", { email: "guest@example.com", password: "password123" }],
    ["register", register, "/api/auth/register", { email: "guest@example.com", password: "password123", displayName: "Guest" }],
    ["forgot password", forgotPassword, "/api/auth/forgot-password", { email: "guest@example.com" }],
    ["reset password", resetPassword, "/api/auth/reset-password", { token: "token", newPassword: "password123" }],
    ["logout", logout, "/api/auth/logout", {}],
  ])("rejects %s without the public action header", async (_label, handler, path, body) => {
    const response = await handler({
      request: jsonRequest(`https://shoot.custard.top${path}`, body),
      env: {},
    } as never);
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(payload.error).toContain("页面操作校验头");
  });
});
