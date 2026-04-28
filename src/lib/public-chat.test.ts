import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultSiteContent } from "../data/content";

const root = process.cwd();
const publicChatApiPath = resolve(root, "functions/api/chat.ts");
const chatHelperPath = resolve(root, "functions/_chat.ts");
const adminChatApiPath = resolve(root, "functions/api/admin/chat.ts");
const widgetPath = resolve(root, "src/components/PublicChatWidget.tsx");
const appSource = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const adminSource = readFileSync(resolve(root, "src/components/AdminDashboard.tsx"), "utf8");
const adminCss = readFileSync(resolve(root, "src/styles/admin.css"), "utf8");
const globalCss = readFileSync(resolve(root, "src/styles/global.css"), "utf8");
const schema = readFileSync(resolve(root, "schema.sql"), "utf8");

describe("public AI chat integration", () => {
  it("defines a public OpenCode Go chat endpoint without admin auth or hardcoded secrets", () => {
    expect(existsSync(publicChatApiPath)).toBe(true);
    expect(existsSync(chatHelperPath)).toBe(true);

    const publicApiSource = readFileSync(publicChatApiPath, "utf8");
    const chatHelperSource = readFileSync(chatHelperPath, "utf8");

    expect(publicApiSource).toContain("OPENCODE_GO_API_KEY");
    expect(publicApiSource).toContain("enforcePublicChatRateLimit");
    expect(publicApiSource).toContain("Retry-After");
    expect(publicApiSource).toContain("text/plain; charset=utf-8");
    expect(publicApiSource).not.toContain("isAdminRequest");
    expect(publicApiSource).not.toContain("sk-");

    expect(chatHelperSource).toContain("https://opencode.ai/zen/go/v1/chat/completions");
    expect(chatHelperSource).toContain('primaryModel = "kimi-k2.5"');
    expect(chatHelperSource).toContain('fallbackModel = "deepseek-v4-flash"');
    expect(chatHelperSource).toContain("openCodeModels");
    expect(chatHelperSource).toContain("stream: true");
    expect(chatHelperSource).toContain("max_tokens: 320");
    expect(chatHelperSource).toContain("parseOpenCodeStream");
    expect(chatHelperSource).toContain("normalizeAssistantReply");
    expect(chatHelperSource).toContain("openCodeMaxAttempts = 1");
    expect(chatHelperSource).toContain("openCodeConnectTimeoutMs = 5_000");
    expect(chatHelperSource).toContain("openCodeFirstChunkTimeoutMs = 4_000");
    expect(chatHelperSource).toContain("readStreamChunkWithTimeout");
    expect(chatHelperSource).toContain("shouldRetryUpstream");
    expect(chatHelperSource).toContain("maxPublicChatMessagesPerHour = 30");
    expect(chatHelperSource).not.toContain("getPublicChatDirectReply");
    expect(chatHelperSource).not.toContain("sk-");
  });

  it("builds a visitor-facing prompt with the homepage audience boundary", async () => {
    const chatModule = await import("../../functions/_chat");
    const buildPublicSystemPrompt = chatModule.__test_buildPublicSystemPrompt as
      | ((content: typeof defaultSiteContent) => string)
      | undefined;

    expect(buildPublicSystemPrompt).toBeTypeOf("function");

    const prompt = buildPublicSystemPrompt?.(defaultSiteContent) ?? "";
    expect(prompt).toContain("访客咨询助手");
    expect(prompt).toContain("只回答官网相关问题");
    expect(prompt).toContain("只接受女生或情侣约拍");
    expect(prompt).toContain("男生单人目前不接");
  });

  it("repairs upstream length cutoffs before showing a reply", async () => {
    const chatModule = await import("../../functions/_chat");
    const normalizeAssistantReply = chatModule.__test_normalizeAssistantReply as
      | ((reply: string, finishReason?: string) => string)
      | undefined;

    expect(normalizeAssistantReply).toBeTypeOf("function");

    const repaired = normalizeAssistantReply?.("拍摄前会充分沟通风格、服装和地点，确保拍出您想要的效果。如果您", "length") ?? "";
    expect(repaired).not.toContain("如果您");
    expect(repaired).toContain("拍摄前会充分沟通风格");
    expect(repaired).toContain("可以继续问我套餐、风格或预约流程");
    expect(normalizeAssistantReply?.("拍摄前会充分沟通风格。", "stop")).toBe("拍摄前会充分沟通风格。");
  });

  it("adds D1-backed public rate limit storage", () => {
    expect(schema).toContain("chat_rate_limits");
    expect(schema).toContain("ip_hash");
    expect(schema).toContain("window_start");
    expect(schema).toContain("primary key (ip_hash, window_start)");
  });

  it("moves chat UI to the public site and removes the admin AI tab", () => {
    expect(existsSync(widgetPath)).toBe(true);
    const widgetSource = readFileSync(widgetPath, "utf8");

    expect(appSource).toContain("PublicChatWidget");
    expect(appSource).toContain("<PublicChatWidget />");
    expect(widgetSource).toContain('fetch("/api/chat"');
    expect(widgetSource).toContain("revealAssistantStream");
    expect(widgetSource).toContain("fetchChatResponse");
    expect(widgetSource).toContain("response.status === 502");
    expect(widgetSource).toContain("body.getReader");
    expect(widgetSource).toContain("TextDecoder");
    expect(widgetSource).toContain("onKeyDown");
    expect(widgetSource).toContain("onCompositionStart");
    expect(widgetSource).toContain("Shift+Enter");
    expect(widgetSource).toContain("prefers-reduced-motion");
    expect(widgetSource).toContain("sendingRef");
    expect(widgetSource).toContain("AI问答");
    expect(widgetSource).not.toContain("sk-");

    expect(globalCss).toContain(".public-chat-widget");
    expect(globalCss).toContain(".public-chat-panel");
    expect(globalCss).toContain("@media (max-width: 640px)");
    expect(globalCss).toContain("100dvh");

    expect(adminSource).not.toContain('"ai"');
    expect(adminSource).not.toContain("AI助手");
    expect(adminSource).not.toContain("/api/admin/chat");
    expect(adminCss).not.toContain(".adm-chat-panel");
    expect(existsSync(adminChatApiPath)).toBe(false);
  });

  it("distinguishes the public chat launcher from booking CTA and avoids fixed-button overlap", () => {
    const navSource = readFileSync(resolve(root, "src/components/SiteNav.tsx"), "utf8");
    const widgetSource = readFileSync(widgetPath, "utf8");

    expect(navSource).toContain("CalendarCheck");
    expect(navSource).toContain("预约");
    expect(navSource).not.toContain("MessageCircle");
    expect(widgetSource).toContain("AI问答");
    expect(widgetSource).not.toContain("<span>咨询</span>");
    expect(globalCss).toContain("right: 156px");
    expect(globalCss).toContain("left: max(12px, env(safe-area-inset-left))");
  });
});
