import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultSiteContent } from "../data/content";

const root = process.cwd();
const publicChatApiPath = resolve(root, "functions/api/chat.ts");
const chatHelperPath = resolve(root, "functions/_chat.ts");
const adminChatApiPath = resolve(root, "functions/api/admin/chat.ts");
const widgetPath = resolve(root, "src/components/PublicChatWidget.tsx");
const launcherPath = resolve(root, "src/components/PublicChatLauncher.tsx");
const rootLayoutSource = readFileSync(resolve(root, "src/layouts/RootLayout.tsx"), "utf8");
const adminSource = readFileSync(resolve(root, "src/components/AdminDashboard.tsx"), "utf8");
const adminCss = readFileSync(resolve(root, "src/styles/admin.css"), "utf8");
const globalCss = [
  "src/styles/global.css",
  "src/styles/base.css",
  "src/styles/site.css",
  "src/styles/hero.css",
  "src/styles/gallery.css",
  "src/styles/sections.css",
  "src/styles/chat.css",
].map((path) => readFileSync(resolve(root, path), "utf8")).join("\n");
const schema = readFileSync(resolve(root, "db/schema.sql"), "utf8");

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
    expect(chatHelperSource).toContain('primaryModel = "deepseek-v4-flash"');
    expect(chatHelperSource).toContain("openCodeModels");
    expect(chatHelperSource).toContain("authorization: `Bearer ${env.OPENCODE_GO_API_KEY}`");
    expect(chatHelperSource).toContain("buildOpenCodeChatBody");
    expect(chatHelperSource).toContain("buildOpenCodeMessages");
    expect(chatHelperSource).toContain("thinking: { type: \"disabled\" }");
    expect(chatHelperSource).toContain("stream: false");
    expect(chatHelperSource).toContain("max_tokens: 520");
    expect(chatHelperSource).not.toContain("max_tokens: 360");
    expect(chatHelperSource).not.toContain("User question:");
    expect(chatHelperSource).not.toContain("This question asks whether a solo male customer can book");
    expect(chatHelperSource).toContain("extractOpenAiChatReply");
    expect(chatHelperSource).toContain("textToReadableStream");
    expect(chatHelperSource).toContain("normalizeAssistantReply");
    expect(chatHelperSource).toContain("openCodeMaxAttempts = 1");
    expect(chatHelperSource).toContain("openCodeResponseTimeoutMs = 18_000");
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
    expect(prompt).toContain("不得说当然可以");
    expect(prompt).toContain("访客咨询助手");
    expect(prompt).toContain("只回答官网相关问题");
    expect(prompt).toContain("只接受女生或情侣约拍");
    expect(prompt).toContain("男生单人目前不接");
  });

  it("builds OpenCode request bodies with thinking disabled for visible replies", async () => {
    const chatModule = await import("../../functions/_chat");
    const buildOpenCodeChatBody = chatModule.__test_buildOpenCodeChatBody as
      | ((
        model: string,
        messages: Array<{ role: "user" | "assistant"; content: string }>,
        content: typeof defaultSiteContent,
      ) => {
        model: string;
        stream: boolean;
        max_tokens: number;
        thinking?: { type: string };
        messages: Array<{ role: string; content: string }>;
      })
      | undefined;

    expect(buildOpenCodeChatBody).toBeTypeOf("function");

    const body = buildOpenCodeChatBody?.(
      "deepseek-v4-flash",
      [{ role: "user", content: "套餐有哪些？" }],
      defaultSiteContent,
    );

    expect(body?.model).toBe("deepseek-v4-flash");
    expect(body?.stream).toBe(false);
    expect(body?.max_tokens).toBe(520);
    expect(body?.thinking).toEqual({ type: "disabled" });
    expect(body?.messages[0]).toEqual({ role: "system", content: expect.stringContaining("访客咨询助手") });
    expect(body?.messages.at(-1)?.content).toContain("直接回答用户问题：套餐有哪些？");
    expect(body?.messages.at(-1)?.content).toContain("不要展示推理");
  });

  it("keeps the latest OpenCode user prompt concise with the male solo boundary", async () => {
    const chatModule = await import("../../functions/_chat");
    const buildOpenCodeMessages = chatModule.__test_buildOpenCodeMessages as
      | ((messages: Array<{ role: "user" | "assistant"; content: string }>) => Array<{ role: string; content: string }>)
      | undefined;

    expect(buildOpenCodeMessages).toBeTypeOf("function");

    const styleMessages = buildOpenCodeMessages?.([
      { role: "user", content: "我适合拍什么风格？" },
    ]) ?? [];
    const modelMessages = buildOpenCodeMessages?.([
      { role: "user", content: "我是男生可以拍吗？" },
    ]) ?? [];

    expect(styleMessages[0]?.content).toContain("直接回答用户问题：我适合拍什么风格？");
    expect(styleMessages[0]?.content).toContain("不要展示推理");
    expect(styleMessages[0]?.content).not.toContain("User question:");
    expect(styleMessages[0]?.content).not.toContain("This question asks whether");
    expect(styleMessages[0]?.content.length).toBeLessThan(120);

    expect(modelMessages[0]?.content).toContain("直接回答用户问题：我是男生可以拍吗？");
    expect(modelMessages[0]?.content).toContain("先回答：男生单人目前不接，只接受女生或情侣约拍。");
    expect(modelMessages[0]?.content).not.toContain("This question asks whether");
  });

  it("sends OpenCode request JSON as ASCII so MiniMax preserves Chinese text", async () => {
    const chatModule = await import("../../functions/_chat");
    const stringifyOpenCodeBody = chatModule.__test_stringifyOpenCodeBody as
      | ((value: unknown) => string)
      | undefined;

    expect(stringifyOpenCodeBody).toBeTypeOf("function");

    const body = stringifyOpenCodeBody?.({ messages: [{ role: "user", content: "套餐有哪些？" }] }) ?? "";
    expect(body).toContain("\\u5957\\u9910");
    expect(body).not.toContain("套餐有哪些");
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
    expect(existsSync(launcherPath)).toBe(true);
    const widgetSource = readFileSync(widgetPath, "utf8");
    const launcherSource = readFileSync(launcherPath, "utf8");

    expect(rootLayoutSource).toContain("PublicChatWidget");
    expect(rootLayoutSource).toContain('lazy(() => import("../components/PublicChatWidget")');
    expect(rootLayoutSource).toContain("<PublicChatLauncher");
    expect(rootLayoutSource).toContain("<PublicChatWidget open={chatOpen} onClose");
    expect(launcherSource).toContain("chat.launcherLabel");
    expect(launcherSource).not.toContain('fetch("/api/chat"');
    expect(widgetSource).toContain('fetch("/api/chat"');
    expect(widgetSource).toContain("revealAssistantStream");
    expect(widgetSource).toContain("fetchChatResponse");
    expect(widgetSource).toContain("chatRequestTimeoutMs");
    expect(widgetSource).toContain("createTimeoutController");
    expect(widgetSource).toContain("response.status === 502");
    expect(widgetSource).toContain("body.getReader");
    expect(widgetSource).toContain("TextDecoder");
    expect(widgetSource).toContain("onKeyDown");
    expect(widgetSource).toContain("onCompositionStart");
    expect(widgetSource).toContain("chat.inputLabel");
    expect(widgetSource).toContain("sendingRef");
    expect(widgetSource).not.toContain("sk-");

    expect(globalCss).toContain(".public-chat-widget");
    expect(globalCss).toContain(".public-chat-panel");
    expect(globalCss).toContain("@media (max-width: 640px)");
    expect(globalCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(globalCss).toContain("100dvh");

    expect(adminSource).not.toContain('"ai"');
    expect(adminSource).not.toContain("AI助手");
    expect(adminSource).not.toContain("/api/admin/chat");
    expect(adminCss).not.toContain(".adm-chat-panel");
    expect(existsSync(adminChatApiPath)).toBe(false);
  });

  it("distinguishes the public chat launcher from booking CTA and avoids fixed-button overlap", () => {
    const navSource = readFileSync(resolve(root, "src/components/shared/Header.tsx"), "utf8");
    const launcherSource = readFileSync(launcherPath, "utf8");

    expect(navSource).toContain("CalendarCheck");
    expect(navSource).toContain('t("nav.booking")');
    expect(navSource).not.toContain("MessageCircle");
    expect(launcherSource).toContain("chat.launcherLabel");
    expect(launcherSource).not.toContain("<span>咨询</span>");
    expect(globalCss).toContain("right: 28px");
    expect(globalCss).toContain("left: max(12px, env(safe-area-inset-left))");
  });
});
