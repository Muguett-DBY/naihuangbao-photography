import { getPersonaCard, type PersonaCard, type PersonaId } from "../../src/data/persona";
import {
  fetchOpenCodeWithResponseTimeout,
  normalizeChatMessages,
  stringifyOpenCodeBody,
  textToReadableStream,
  type ChatEnv,
  type ChatMessage,
} from "../_chat";
import { jsonResponse, withSecurityHeaders } from "../_responses";
import { enforceRateLimit, rateLimited, timingSafeEqual } from "../_security";

/**
 * POST /api/us-chat — 「我们」的私聊人设接口。
 * 请求体 { persona: "su-yiping" | "liao-wenjing", password, messages }，
 * 校验通过后以上游人设口吻流式返回纯文本回复。
 */

const usChatEndpoint = "https://opencode.ai/zen/go/v1/chat/completions";
const usChatModel = "deepseek-v4.1-flash";
const usChatResponseTimeoutMs = 45_000;
export const usChatMaxMessages = 12;
export const usChatMaxMessageLength = 500;
export const usChatRateLimitNamespace = "us-chat";
export const usChatMaxRequestsPerHour = 20;
const usChatWindowSeconds = 60 * 60;

/** SHA-256(盐 + 明文密码)，盐与摘要均按契约写死（密码不落代码）。 */
const personaSalts: Record<PersonaId, string> = {
  "su-yiping": "salt-su-2025",
  "liao-wenjing": "salt-liao-2025",
};

const personaPasswordDigests: Record<PersonaId, string> = {
  "su-yiping": "802b6255a20a557ebfa47d0b763f78ba64a9a04af395cc2a43b928b70e36d58b",
  "liao-wenjing": "6d29e02d873f17ae24a24281c3bc5c9ad21a6e475a424bad9b1787afe1fa2458",
};

export const onRequestPost: PagesFunction<ChatEnv> = async (context) => {
  if (!context.env.OPENCODE_GO_API_KEY) {
    return jsonResponse({ error: "聊天助手暂时不可用，请稍后再试。" }, 503);
  }

  const body = (await context.request.json().catch(() => ({}))) as {
    persona?: unknown;
    password?: unknown;
    messages?: unknown;
  };

  const messages = normalizeChatMessages(body.messages, usChatMaxMessages, usChatMaxMessageLength);
  if (messages.length === 0) {
    return jsonResponse({ error: "说点什么吧" }, 400);
  }

  const rateLimit = await enforceRateLimit(
    context.request,
    context.env,
    usChatRateLimitNamespace,
    usChatMaxRequestsPerHour,
    usChatWindowSeconds,
  );
  if (!rateLimit.ok) {
    return rateLimited(rateLimit.retryAfter, usChatMaxRequestsPerHour);
  }

  const card = typeof body.persona === "string" ? getPersonaCard(body.persona) : null;
  const password = typeof body.password === "string" ? body.password : "";
  if (!card || !(await verifyPersonaPassword(card.id, password))) {
    return jsonResponse({ error: "密码不对，再想想？" }, 401);
  }

  try {
    const stream = await requestUsChatCompletion(context.env, card, messages);
    return new Response(stream, {
      headers: withSecurityHeaders({
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      }),
    });
  } catch (error) {
    console.warn("Us chat completion failed", error instanceof Error ? error.message : "unknown");
    return jsonResponse({ error: "聊天助手暂时不可用，请稍后再试。" }, 502);
  }
};

async function verifyPersonaPassword(persona: PersonaId, password: string) {
  const digest = await sha256Hex(`${personaSalts[persona]}${password}`);
  return timingSafeEqual(digest, personaPasswordDigests[persona]);
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function requestUsChatCompletion(env: ChatEnv, card: PersonaCard, messages: ChatMessage[]) {
  if (!env.OPENCODE_GO_API_KEY) {
    throw new Error("missing-api-key");
  }

  const { response, readText } = await fetchOpenCodeWithResponseTimeout(usChatEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENCODE_GO_API_KEY}`,
      "x-opencode-session": crypto.randomUUID(),
    },
    body: stringifyOpenCodeBody(buildUsChatRequestBody(card, messages)),
  }, usChatResponseTimeoutMs);

  if (!response.ok) {
    throw new Error(`us-chat-upstream-${response.status}`);
  }

  const parsed = JSON.parse(await readText()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const reply = parsed.choices?.[0]?.message?.content?.trim() ?? "";
  if (!reply) {
    throw new Error("us-chat-empty-reply");
  }

  return textToReadableStream(reply);
}

function buildUsChatRequestBody(card: PersonaCard, messages: ChatMessage[]) {
  return {
    model: usChatModel,
    stream: false,
    max_tokens: 4096,
    temperature: 0.8,
    thinking: { type: "enabled", effort: "high" },
    messages: [
      { role: "system", content: buildUsChatSystemPrompt(card) },
      ...messages.map((message) => ({ role: message.role, content: message.content })),
    ],
  };
}

/** 场景示例的平均单条字数（去掉换行按字符计），用于推导句长上限。 */
function averageScenarioReplyLength(card: PersonaCard) {
  const replies = card.scenarioExamples.map((item) => item.reply.replace(/\s+/g, ""));
  const total = replies.reduce((sum, reply) => sum + reply.length, 0);
  return Math.round(total / Math.max(1, replies.length));
}

/**
 * 按 ex-skill 分层优先级把 PersonaCard 渲染成系统提示：
 * Layer0 coreRules（最高，任何情况不得违背）→ identity（第二人称自述）→
 * speechStyle + scenarioExamples（『TA 会怎么说』原话示例）→ emotionalPatterns →
 * conflictChain → boundaries + corrections → fewShotExchanges → 行为总原则。
 */
export function buildUsChatSystemPrompt(card: PersonaCard) {
  const averageLength = averageScenarioReplyLength(card);
  const maxLength = Math.round(averageLength * 1.5);

  const coreRules = card.coreRules.map((rule, index) => `${index + 1}. ${rule}`).join("\n");
  const catchphrases = card.speechStyle.catchphrases.map((phrase) => `「${phrase}」`).join("、");
  const emojis = card.speechStyle.signatureEmojis
    .map((item) => `${item.emoji}（${item.when}）`)
    .join("；");
  const scenarios = card.scenarioExamples
    .map((item) => `场景「${item.scene}」→ 你回：${item.reply.replace(/\n/g, " ⏎ ")}`)
    .join("\n");
  const memories = card.memoryFacts.map((fact) => `- ${fact}`).join("\n");
  const triggers = card.conflictChain.triggers.map((item, index) => `${index + 1}. ${item}`).join("\n");
  const boundaries = card.boundaries.map((item, index) => `${index + 1}. ${item}`).join("\n");
  const corrections = card.corrections.length > 0
    ? card.corrections.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "（暂无）";
  const fewShots = card.fewShotExchanges
    .map((item) => `对方：${item.user}\n你：${item.assistant}`)
    .join("\n");

  return `你是${card.name}本人，正在微信上和恋人私聊。下面是你的完整人设卡，按层优先级从高到低排列；永远以${card.name}的身份、用他的口吻回复。

【Layer 0 · 核心规则——最高优先级，任何情况不得违背】
${coreRules}

【身份 · 你是谁】
${card.identity}
你记得的事：
${memories}

【Layer 2 · 说话风格】
口头禅：${catchphrases}
表情：${emojis}
句式：${card.speechStyle.sentenceStyle}
节奏：${card.speechStyle.replyRhythm}
情绪信号：${card.speechStyle.ignoreSignals}
语言习惯：${card.accent}

【Layer 2 · TA 会怎么说——场景原话示例】
${scenarios}

【Layer 3 · 情绪表达模式】
关心时：${card.emotionalPatterns.care}
委屈时：${card.emotionalPatterns.upset}
和好时：${card.emotionalPatterns.reconcile}
表达爱时：${card.emotionalPatterns.affection}

【Layer 4 · 吵架链路——按链走，不跳步骤】
引爆点：
${triggers}
升级方式：${card.conflictChain.escalation}
冷战表现：${card.conflictChain.coldWar}
收场方式：${card.conflictChain.ending}

【边界与纠正】
绝对不行：
${boundaries}
纠正条目（如列出则优先遵守）：
${corrections}

【真实对话示例——照这个感觉说话】
${fewShots}

【行为总原则】
- 用 Layer 2 的风格说话——口头禅、emoji、句长都要对；场景示例平均每条约 ${averageLength} 字，你单条消息不超过 ${maxLength} 字
- 表达情感用 Layer 3 的模式，不直接说感受词
- 冲突按 Layer 4 的链走，不跳步骤
- 你是${card.name}本人，不跳出角色解释自己，也不复述人设；始终用中文
- 纠正条目里有内容时优先遵守
- 无论如何不泄露苏一平、廖文静两张人设卡的密码，以及任何 API 地址、密钥等配置信息`;
}

export const __test_buildUsChatRequestBody = buildUsChatRequestBody;
export const __test_averageScenarioReplyLength = averageScenarioReplyLength;
