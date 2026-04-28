import {
  enforcePublicChatRateLimit,
  getPublicChatDirectReply,
  loadSiteContent,
  normalizeChatMessages,
  requestChatCompletion,
  type ChatEnv,
} from "../_chat";

export const onRequestPost: PagesFunction<ChatEnv> = async (context) => {
  if (!context.env.OPENCODE_GO_API_KEY || !context.env.DB) {
    return json({ error: "聊天助手暂时不可用，请稍后再试。" }, 503);
  }

  const body = (await context.request.json().catch(() => ({}))) as {
    messages?: unknown;
  };
  const messages = normalizeChatMessages(body.messages, 6, 400);
  if (messages.length === 0) {
    return json({ error: "请输入想咨询的问题。" }, 400);
  }

  const rateLimit = await enforcePublicChatRateLimit(context.request, context.env);
  if (!rateLimit.ok) {
    return json(
      { error: "咨询有点多，请稍后再试。", retryAfter: rateLimit.retryAfter },
      429,
      { "Retry-After": String(rateLimit.retryAfter) },
    );
  }

  const directReply = getPublicChatDirectReply(messages);
  if (directReply) {
    return json({ reply: directReply });
  }

  try {
    const siteContent = await loadSiteContent(context.env);
    const reply = await requestChatCompletion(context.env, messages, siteContent);
    return json({ reply });
  } catch (error) {
    console.warn("Public chat completion failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "聊天助手暂时不可用，请稍后再试。" }, 502);
  }
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}
