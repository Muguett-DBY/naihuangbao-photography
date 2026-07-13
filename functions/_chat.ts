import { contentKeys, defaultSiteContent, mergeSiteContent } from "../src/data/content";
import type { PartialSiteContent, SiteContent } from "../src/types/content";
import { enforceRateLimit } from "./_security";

type D1DatabaseLike = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<{ results: T[] }>;
      first<T>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
    all<T>(): Promise<{ results: T[] }>;
  };
};

export type ChatEnv = {
  OPENCODE_GO_API_KEY?: string;
  RATE_LIMIT_SECRET?: string;
  CHAT_RATE_LIMIT_SECRET?: string;
  DB?: D1DatabaseLike;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ContentRow = {
  key: string;
  value_json: string;
};

type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number };

const openCodeEndpoint = "https://opencode.ai/zen/go/v1/chat/completions";
const primaryModel = "deepseek-v4-flash";
const openCodeModels = [primaryModel];
const openCodeMaxAttempts = 1;
const openCodeResponseTimeoutMs = 18_000;
export const maxPublicChatMessagesPerHour = 30;
const publicChatWindowSeconds = 60 * 60;

export function normalizeChatMessages(value: unknown, maxMessages = 6, maxMessageLength = 400): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is ChatMessage => isChatMessage(item))
    .slice(-maxMessages)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, maxMessageLength),
    }))
    .filter((item) => item.content.length > 0);
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (item.role === "user" || item.role === "assistant") && typeof item.content === "string";
}

export async function loadSiteContent(env: ChatEnv): Promise<SiteContent> {
  if (!env.DB) return defaultSiteContent;

  try {
    const rows = await env.DB.prepare(
      `select key, value_json
       from cms_content
       where key in (${contentKeys.map(() => "?").join(", ")})`,
    )
      .bind(...contentKeys)
      .all<ContentRow>();

    return mergeSiteContent(rowsToContent(rows.results));
  } catch (error) {
    console.warn("Chat: loadSiteContent fallback", error);
    return defaultSiteContent;
  }
}

function rowsToContent(rows: ContentRow[]): PartialSiteContent {
  const content: Record<string, unknown> = {};

  for (const row of rows) {
    if (!contentKeys.includes(row.key as never)) continue;
    try {
      content[row.key] = JSON.parse(row.value_json);
    } catch (error) {
      console.warn("Chat: malformed CMS row", row.key, error);
    }
  }

  return content as PartialSiteContent;
}

export function buildPublicSystemPrompt(content: SiteContent) {
  const packages = content.packages
    .map((item) => `${item.name}${item.price}/${item.duration}，${item.summary}`)
    .join("；");
  const policies = content.servicePolicies
    .map((item) => `${item.title}: ${item.detail}`)
    .join("；");
  const process = content.processSteps
    .map((item, index) => `${index + 1}. ${item}`)
    .join("；");
  const safety = [
    content.sectionCopy.safety.title,
    ...content.sectionCopy.safety.paragraphs,
  ].join("；");

  return `你是奶黄包摄影官网的访客咨询助手，只回答官网相关问题。
资料：品牌=${content.siteConfig.brandName}；城市=${content.siteConfig.city}；简介=${content.sectionCopy.about.body}
边界=${safety}
套餐=${packages}
规则=${policies}
流程=${process}
回答要求：只答官网、套餐、流程、边界、隐私授权、风格建议、地点建议和预约方式；无关问题礼貌拒答；不要编造档期、优惠、价格、交付承诺或联系方式；最高优先级：如果用户询问男生、男生单人、男客单人是否可以拍，必须先明确回答“男生单人目前不接，只接受女生或情侣约拍”，可以引导了解情侣约拍，不得说当然可以、面向所有客户或不限性别；引导通过页面小红书入口联系；80 到 140 个汉字，最多 4 句，完整句结尾。`;
}

export async function requestChatCompletionStream(env: ChatEnv, messages: ChatMessage[], siteContent: SiteContent) {
  if (!env.OPENCODE_GO_API_KEY) {
    throw new Error("missing-api-key");
  }

  let lastError = "upstream-unavailable";

  for (const model of openCodeModels) {
    for (let attempt = 1; attempt <= openCodeMaxAttempts; attempt += 1) {
      try {
        const response = await fetchOpenCodeWithResponseTimeout(openCodeEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${env.OPENCODE_GO_API_KEY}`,
          },
          body: stringifyOpenCodeBody(buildOpenCodeChatBody(model, messages, siteContent)),
        }, openCodeResponseTimeoutMs);

        if (!response.ok) {
          lastError = `${model}-upstream-${response.status}`;
          if (!shouldRetryUpstream(response.status) || attempt === openCodeMaxAttempts) break;
          await waitBeforeRetry(attempt);
          continue;
        }

        const result = extractOpenAiChatReply(await response.text());
        const reply = normalizeAssistantReply(result.reply, result.finishReason);
        if (reply) {
          return textToReadableStream(reply);
        }

        lastError = `${model}-empty-reply`;
      } catch (error) {
        lastError = error instanceof Error && error.message === "upstream-timeout"
          ? `${model}-upstream-timeout`
          : `${model}-upstream-network`;
      }

      if (attempt < openCodeMaxAttempts) {
        await waitBeforeRetry(attempt);
      }
    }
  }

  throw new Error(lastError);
}

function stringifyOpenCodeBody(value: unknown) {
  return JSON.stringify(value).replace(/[^\x00-\x7F]/g, (char) => (
    Array.from(char)
      .map((unit) => `\\u${unit.charCodeAt(0).toString(16).padStart(4, "0")}`)
      .join("")
  ));
}

function buildOpenCodeChatBody(model: string, messages: ChatMessage[], siteContent: SiteContent) {
  return {
    model,
    stream: false,
    max_tokens: 520,
    temperature: 0.2,
    thinking: { type: "disabled" },
    messages: [
      { role: "system", content: buildPublicSystemPrompt(siteContent) },
      ...buildOpenCodeMessages(messages),
    ],
  };
}

function buildOpenCodeMessages(messages: ChatMessage[]) {
  const lastUserIndex = findLastUserMessageIndex(messages);

  return messages.map((message, index) => ({
    role: message.role,
    content: index === lastUserIndex
      ? buildLatestUserPrompt(message.content)
      : message.content,
  }));
}

function findLastUserMessageIndex(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") return index;
  }

  return -1;
}

function buildLatestUserPrompt(content: string) {
  const lines = [
    `直接回答用户问题：${content}`,
    "不要展示推理；不要说问题缺失、不清楚或无法识别。",
  ];

  if (isMaleSoloQuestion(content)) {
    lines.push("先回答：男生单人目前不接，只接受女生或情侣约拍。可以补充说明情侣约拍可以了解。");
  }

  return lines.join("\n");
}

function isMaleSoloQuestion(content: string) {
  return /男生|男客|男士|男孩子|男的/.test(content)
    && /拍|约拍|写真|预约|可以|能不能|能拍|接不接|接受/.test(content)
    && !/情侣|女朋友|女友|对象|伴侣/.test(content);
}

async function fetchOpenCodeWithResponseTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("upstream-timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function extractOpenAiChatReply(text: string) {
  try {
    const parsed = JSON.parse(text) as {
      choices?: Array<{
        finish_reason?: string;
        message?: {
          content?: string;
        };
      }>;
    };
    const choice = parsed.choices?.[0];
    return {
      reply: choice?.message?.content ?? "",
      finishReason: choice?.finish_reason,
    };
  } catch {
    return {
      reply: "",
      finishReason: undefined,
    };
  }
}

function textToReadableStream(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

export function normalizeAssistantReply(reply: string, finishReason?: string) {
  const trimmed = reply.trim();
  if (!trimmed) return "";

  const endsWithCompleteSentence = /[。！？.!?]$/.test(trimmed);
  const hasDanglingTail = /(如果您|如果你|如果|建议您|建议你|您可以|你可以|另外|同时|比如|例如)[，,：:\s]*$/.test(trimmed);
  if (endsWithCompleteSentence && !hasDanglingTail) return trimmed;

  const shouldRepair = finishReason === "length" || hasDanglingTail;
  if (!shouldRepair) return trimmed;

  const lastCompleteSentence = trimmed.match(/[\s\S]*[。！？.!?]/)?.[0]?.trim();
  if (lastCompleteSentence) {
    return `${lastCompleteSentence}\n\n如果还想继续了解，可以继续问我套餐、风格或预约流程。`;
  }

  return `${trimmed}。`;
}

function shouldRetryUpstream(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function waitBeforeRetry(attempt: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, 450 * attempt);
  });
}

export async function enforcePublicChatRateLimit(request: Request, env: ChatEnv): Promise<RateLimitResult> {
  if (!env.DB) {
    return { ok: false, retryAfter: publicChatWindowSeconds };
  }

  return enforceRateLimit(
    request,
    env,
    "public-chat",
    maxPublicChatMessagesPerHour,
    publicChatWindowSeconds,
  );
}

export const __test_buildPublicSystemPrompt = buildPublicSystemPrompt;
export const __test_buildOpenCodeChatBody = buildOpenCodeChatBody;
export const __test_buildOpenCodeMessages = buildOpenCodeMessages;
export const __test_stringifyOpenCodeBody = stringifyOpenCodeBody;
export const __test_normalizeAssistantReply = normalizeAssistantReply;
