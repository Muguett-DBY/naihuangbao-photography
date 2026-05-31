import {
  enforcePublicChatRateLimit,
  loadSiteContent,
  normalizeChatMessages,
  requestChatCompletionStream,
  type ChatEnv,
} from "../_chat";
import { jsonResponse, withSecurityHeaders } from "../_responses";

export const onRequestPost: PagesFunction<ChatEnv> = async (context) => {
  if (!context.env.OPENCODE_GO_API_KEY || !context.env.DB) {
    return jsonResponse({ error: "聊天助手暂时不可用，请稍后再试。" }, 503);
  }

  const body = (await context.request.json().catch(() => ({}))) as {
    messages?: unknown;
  };
  const messages = normalizeChatMessages(body.messages, 6, 400);
  if (messages.length === 0) {
    return jsonResponse({ error: "请输入想咨询的问题。" }, 400);
  }

  const rateLimit = await enforcePublicChatRateLimit(context.request, context.env);
  if (!rateLimit.ok) {
    return jsonResponse(
      { error: "咨询有点多，请稍后再试。", retryAfter: rateLimit.retryAfter },
      429,
      { "Retry-After": String(rateLimit.retryAfter) },
    );
  }

  try {
    const siteContent = await loadSiteContent(context.env);
    const stream = await requestChatCompletionStream(context.env, messages, siteContent);
    return new Response(stream, {
      headers: withSecurityHeaders({
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      }),
    });
  } catch (error) {
    console.warn("Public chat completion failed", error instanceof Error ? error.message : "unknown");
    return jsonResponse({ error: "聊天助手暂时不可用，请稍后再试。" }, 502);
  }
};
