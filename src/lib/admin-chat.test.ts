import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const chatApiPath = resolve(root, "functions/api/admin/chat.ts");
const adminSource = readFileSync(resolve(root, "src/components/AdminDashboard.tsx"), "utf8");
const adminCss = readFileSync(resolve(root, "src/styles/admin.css"), "utf8");

describe("admin AI assistant integration", () => {
  it("defines an authenticated OpenCode Go chat endpoint without hardcoded secrets", () => {
    expect(existsSync(chatApiPath)).toBe(true);
    const chatApiSource = readFileSync(chatApiPath, "utf8");

    expect(chatApiSource).toContain("isAdminRequest");
    expect(chatApiSource).toContain("OPENCODE_GO_API_KEY");
    expect(chatApiSource).toContain("https://opencode.ai/zen/go/v1/chat/completions");
    expect(chatApiSource).toContain("deepseek-v4-flash");
    expect(chatApiSource).toContain("只回答网站相关问题");
    expect(chatApiSource).toContain("stream: false");
    expect(chatApiSource).not.toContain("sk-");
  });

  it("adds an admin-only AI assistant tab with pseudo streaming UI states", () => {
    expect(adminSource).toContain('"ai"');
    expect(adminSource).toContain("AI助手");
    expect(adminSource).toContain('fetch("/api/admin/chat"');
    expect(adminSource).toContain("revealAssistantReply");
    expect(adminSource).toContain("chatLoading");
    expect(adminSource).toContain("chatError");
    expect(adminSource).toContain("清空");
    expect(adminSource).not.toContain("sk-");
  });

  it("styles the assistant panel and typewriter cursor in admin CSS", () => {
    expect(adminCss).toContain(".adm-chat-panel");
    expect(adminCss).toContain(".adm-chat-message");
    expect(adminCss).toContain(".adm-chat-cursor");
    expect(adminCss).toContain("@keyframes admChatCursor");
  });
});
