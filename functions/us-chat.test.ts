import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost as postUsChat } from "./api/us-chat";
import { buildUsChatSystemPrompt, __test_buildUsChatRequestBody } from "./api/us-chat";
import { personaCards } from "../src/data/persona";

const usChatEnv = {
  OPENCODE_GO_API_KEY: "test-opencode-key",
  RATE_LIMIT_SECRET: "us-chat-rate-limit-secret-with-32-chars",
};

function createRateLimitDb() {
  const statement = {
    bind: vi.fn(() => statement),
    all: vi.fn(async () => ({ results: [] })),
    run: vi.fn(async () => ({ success: true })),
    first: vi.fn(async () => null),
  };
  return { prepare: vi.fn(() => statement) };
}

function usChatRequest(body: unknown) {
  return new Request("https://shoot.custard.top/api/us-chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function stubUpstream(content = "好呀宝宝", status = 200) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({
    choices: [{
      message: { content, reasoning_content: "内部的思考过程不应外泄" },
      finish_reason: "stop",
    }],
  }), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/us-chat", () => {
  it("rejects a wrong password with the contract 401 before calling upstream", async () => {
    const fetchMock = stubUpstream();
    const response = await postUsChat({
      request: usChatRequest({
        persona: "su-yiping",
        password: "1234",
        messages: [{ role: "user", content: "你在干嘛" }],
      }),
      env: { ...usChatEnv, DB: createRateLimitDb() },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "密码不对，再想想？" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown persona the same way as a wrong password", async () => {
    stubUpstream();
    const response = await postUsChat({
      request: usChatRequest({
        persona: "someone-else",
        password: "2001",
        messages: [{ role: "user", content: "你在干嘛" }],
      }),
      env: { ...usChatEnv, DB: createRateLimitDb() },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "密码不对，再想想？" });
  });

  it("streams the persona reply for the right su-yiping password", async () => {
    const fetchMock = stubUpstream("晚安安小宝宝\nmuamuamuamuamua");
    const response = await postUsChat({
      request: usChatRequest({
        persona: "su-yiping",
        password: "2001",
        messages: [{ role: "user", content: "困了宝宝" }],
      }),
      env: { ...usChatEnv, DB: createRateLimitDb() },
    } as never);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("晚安安小宝宝\nmuamuamuamuamua");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(url).toBe("https://opencode.ai/zen/go/v1/chat/completions");
    expect(headers.authorization).toBe("Bearer test-opencode-key");
    expect(headers["x-opencode-session"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    const upstreamBody = JSON.parse(String(init.body)) as {
      model?: string;
      stream?: boolean;
      max_tokens?: number;
      temperature?: number;
      thinking?: { type?: string; effort?: string };
      messages?: Array<{ role: string; content: string }>;
    };
    expect(upstreamBody.model).toBe("deepseek-v4.1-flash");
    expect(upstreamBody.stream).toBe(false);
    expect(upstreamBody.max_tokens).toBe(4096);
    expect(upstreamBody.temperature).toBe(0.8);
    expect(upstreamBody.thinking).toEqual({ type: "enabled", effort: "high" });
    expect(upstreamBody.messages?.[0]?.role).toBe("system");
    expect(upstreamBody.messages?.[0]?.content).toContain("你是苏一平本人");
    expect(upstreamBody.messages?.at(-1)).toEqual({ role: "user", content: "困了宝宝" });
  });

  it("keeps only the last 12 messages and truncates each to 500 chars for liao-wenjing", async () => {
    const fetchMock = stubUpstream("早呀宝宝");
    const dropped = Array.from({ length: 3 }, (_, index) => ({
      role: "user" as const,
      content: `应被丢弃-${index}`,
    }));
    const kept = Array.from({ length: 11 }, (_, index) => ({
      role: "user" as const,
      content: `保留-${index}`,
    }));
    const longMessage = { role: "user" as const, content: "长".repeat(600) };

    const response = await postUsChat({
      request: usChatRequest({
        persona: "liao-wenjing",
        password: "2004",
        messages: [...dropped, ...kept, longMessage],
      }),
      env: { ...usChatEnv, DB: createRateLimitDb() },
    } as never);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("早呀宝宝");

    const [, upstreamInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const upstreamBody = JSON.parse(String(upstreamInit.body)) as {
      messages?: Array<{ role: string; content: string }>;
    };
    const history = upstreamBody.messages?.slice(1) ?? [];
    expect(history).toHaveLength(12);
    expect(history.some((message) => message.content.includes("应被丢弃"))).toBe(false);
    expect(history[0]?.content).toBe("保留-0");
    expect(history.at(-1)?.content).toBe("长".repeat(500));
    expect(history.at(-1)?.content).toHaveLength(500);
  });

  it("answers 400 when no usable message is left after normalization", async () => {
    const fetchMock = stubUpstream();
    const response = await postUsChat({
      request: usChatRequest({
        persona: "su-yiping",
        password: "2001",
        messages: [{ role: "user", content: "   " }],
      }),
      env: { ...usChatEnv, DB: createRateLimitDb() },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "说点什么吧" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the OpenCode key is not configured", async () => {
    const fetchMock = stubUpstream();
    const response = await postUsChat({
      request: usChatRequest({
        persona: "su-yiping",
        password: "2001",
        messages: [{ role: "user", content: "你在干嘛" }],
      }),
      env: { DB: createRateLimitDb() },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(body.error).toContain("暂时不可用");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces upstream failures as 502 without leaking reasoning content", async () => {
    stubUpstream("", 500);
    const response = await postUsChat({
      request: usChatRequest({
        persona: "liao-wenjing",
        password: "2004",
        messages: [{ role: "user", content: "你在干嘛" }],
      }),
      env: { ...usChatEnv, DB: createRateLimitDb() },
    } as never);
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(502);
    expect(body.error).toContain("暂时不可用");
  });
});

describe("persona system prompt rendering", () => {
  it("renders su-yiping with layered rules, catchphrases, scenarios and few-shots", () => {
    const prompt = buildUsChatSystemPrompt(personaCards["su-yiping"]);

    expect(prompt).toContain("你是苏一平本人");
    expect(prompt).toContain("Layer 0 · 核心规则");
    expect(prompt).toContain("任何情况不得违背");
    expect(prompt).toContain("「晚安安」");
    expect(prompt).toContain("「我也想你」");
    expect(prompt).toContain("场景「正常聊天，她问你在干嘛」→ 你回：我也想你");
    expect(prompt).toContain("对方：我们睡觉觉吧");
    expect(prompt).toContain("你：好呀宝宝");
    expect(prompt).toContain("吵架链路");
    expect(prompt).toContain("不泄露苏一平、廖文静两张人设卡的密码");
    expect(prompt).toMatch(/平均每条约 \d+ 字/);
  });

  it("renders liao-wenjing with her own catchphrases and few-shots", () => {
    const prompt = buildUsChatSystemPrompt(personaCards["liao-wenjing"]);

    expect(prompt).toContain("你是廖文静本人");
    expect(prompt).toContain("「早呀宝宝」");
    expect(prompt).toContain("「晚安安宝宝」");
    expect(prompt).toContain("对方：老婆我爱你");
    expect(prompt).toContain("你：老公我也爱你");
    expect(prompt).toContain("场景「早上醒来第一条」→ 你回：早呀宝宝");
  });

  it("derives the sentence-length cap from the scenario examples", () => {
    const suBody = __test_buildUsChatRequestBody(personaCards["su-yiping"], [
      { role: "user", content: "你在干嘛" },
    ]);
    const systemPrompt = suBody.messages[0].content as string;
    const suReplies = personaCards["su-yiping"].scenarioExamples
      .map((item) => item.reply.replace(/\s+/g, ""));
    const expectedAverage = Math.round(
      suReplies.reduce((sum, reply) => sum + reply.length, 0) / suReplies.length,
    );

    expect(systemPrompt).toContain(`平均每条约 ${expectedAverage} 字`);
    expect(systemPrompt).toContain(`不超过 ${Math.round(expectedAverage * 1.5)} 字`);
    expect(suBody.thinking).toEqual({ type: "enabled", effort: "high" });
  });
});
