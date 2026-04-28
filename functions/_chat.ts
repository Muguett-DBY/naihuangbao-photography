import { contentKeys, defaultSiteContent, mergeSiteContent } from "../src/data/content";
import type { PartialSiteContent, SiteContent } from "../src/types/content";

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

const openCodeEndpoint = "https://opencode.ai/zen/go/v1/messages";
const primaryModel = "minimax-m2.5";
const fallbackModel = "minimax-m2.7";
const openCodeModels = [primaryModel, fallbackModel];
const openCodeMaxAttempts = 1;
const openCodeConnectTimeoutMs = 5_000;
const openCodeFirstChunkTimeoutMs = 10_000;
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
  } catch {
    return defaultSiteContent;
  }
}

function rowsToContent(rows: ContentRow[]): PartialSiteContent {
  const content: Record<string, unknown> = {};

  for (const row of rows) {
    if (!contentKeys.includes(row.key as never)) continue;
    try {
      content[row.key] = JSON.parse(row.value_json);
    } catch {
      // Ignore malformed CMS rows and fall back to defaults for that section.
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
        const response = await fetchOpenCodeWithConnectTimeout(openCodeEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": env.OPENCODE_GO_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            stream: true,
            max_tokens: 320,
            temperature: 0.4,
            system: buildPublicSystemPrompt(siteContent),
            messages: buildOpenCodeMessages(messages),
          }),
        }, openCodeConnectTimeoutMs);

        if (!response.ok) {
          lastError = `${model}-upstream-${response.status}`;
          if (!shouldRetryUpstream(response.status) || attempt === openCodeMaxAttempts) break;
          await waitBeforeRetry(attempt);
          continue;
        }

        if (response.body) {
          return await parseOpenCodeStream(response.body);
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
    `User question: ${content}`,
    "Answer this exact user question in Chinese. Do not say the question is missing, unclear, or unrecognized.",
  ];

  if (isMaleSoloQuestion(content)) {
    lines.push("This question asks whether a solo male customer can book. First answer in Chinese: 男生单人目前不接，只接受女生或情侣约拍。You may mention couple sessions are welcome.");
  }

  return lines.join("\n");
}

function isMaleSoloQuestion(content: string) {
  return /男生|男客|男士|男孩子|男的/.test(content)
    && /拍|约拍|写真|预约|可以|能不能|能拍|接不接|接受/.test(content)
    && !/情侣|女朋友|女友|对象|伴侣/.test(content);
}

async function fetchOpenCodeWithConnectTimeout(url: string, init: RequestInit, timeoutMs: number) {
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

async function parseOpenCodeStream(body: ReadableStream<Uint8Array>) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = body.getReader();
  const pending: Uint8Array[] = [];
  let buffer = "";
  let upstreamDone = false;
  let upstreamError: unknown = null;

  function flushOpenCodeLines(flushAll: boolean) {
    const lines = buffer.split(/\r?\n/);
    buffer = flushAll ? "" : lines.pop() ?? "";
    const completeLines = flushAll ? lines : lines.slice(0, -1);

    for (const line of completeLines) {
      enqueueOpenCodeLine(line, pending, encoder);
    }
  }

  async function readUntilContentOrDone() {
    while (pending.length === 0 && !upstreamDone && !upstreamError) {
      try {
        const { done, value } = await readStreamChunkWithTimeout(reader, openCodeFirstChunkTimeoutMs);
        if (done) {
          buffer += decoder.decode();
          flushOpenCodeLines(true);
          upstreamDone = true;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        flushOpenCodeLines(false);
      } catch (error) {
        upstreamError = error;
      }
    }
  }

  await readUntilContentOrDone();

  if (upstreamError) {
    throw upstreamError;
  }

  if (pending.length === 0 && upstreamDone) {
    throw new Error("empty-reply");
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      await readUntilContentOrDone();

      const chunk = pending.shift();
      if (chunk) {
        controller.enqueue(chunk);
        return;
      }

      if (upstreamError) {
        controller.error(upstreamError);
        return;
      }

      if (upstreamDone) {
        controller.close();
      }
    },
  });
}

async function readStreamChunkWithTimeout(reader: ReadableStreamDefaultReader<Uint8Array>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error("upstream-timeout"));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    void reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function enqueueOpenCodeLine(line: string, pending: Uint8Array[], encoder: TextEncoder) {
  const trimmed = line.trim();
  const data = trimmed.startsWith("data:")
    ? trimmed.slice(5).trim()
    : trimmed.startsWith("{")
      ? trimmed
      : "";

  if (!data || data === "[DONE]") return;

  try {
    const parsed = JSON.parse(data) as {
      choices?: Array<{
        delta?: { content?: string };
        message?: { content?: string };
        text?: string;
      }>;
      delta?: { type?: string; text?: string };
      content_block?: { type?: string; text?: string };
      content?: Array<{ type?: string; text?: string }>;
    };
    const content = parsed.choices?.[0]?.delta?.content
      ?? parsed.choices?.[0]?.message?.content
      ?? parsed.choices?.[0]?.text
      ?? (parsed.delta?.type === "text_delta" ? parsed.delta.text : undefined)
      ?? (parsed.content_block?.type === "text" ? parsed.content_block.text : undefined)
      ?? parsed.content?.find((item) => item.type === "text")?.text
      ?? "";
    if (content) {
      pending.push(encoder.encode(content));
    }
  } catch {
    // Ignore malformed upstream stream lines and keep consuming the stream.
  }
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

  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = nowSeconds - (nowSeconds % publicChatWindowSeconds);
  const retryAfter = Math.max(1, windowStart + publicChatWindowSeconds - nowSeconds);
  const ipHash = await hashClientIp(readClientIp(request), env.CHAT_RATE_LIMIT_SECRET ?? env.OPENCODE_GO_API_KEY ?? "public-chat");
  const updatedAt = new Date(nowSeconds * 1000).toISOString();

  await env.DB.prepare(
    `insert into chat_rate_limits (ip_hash, window_start, count, updated_at)
     values (?, ?, 1, ?)
     on conflict(ip_hash, window_start)
     do update set count = count + 1, updated_at = excluded.updated_at`,
  )
    .bind(ipHash, windowStart, updatedAt)
    .run();

  const row = await env.DB.prepare(
    `select count
     from chat_rate_limits
     where ip_hash = ? and window_start = ?`,
  )
    .bind(ipHash, windowStart)
    .first<{ count: number }>();

  return Number(row?.count ?? 1) <= maxPublicChatMessagesPerHour
    ? { ok: true }
    : { ok: false, retryAfter };
}

function readClientIp(request: Request) {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

async function hashClientIp(ip: string, secret: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(`${secret}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const __test_buildPublicSystemPrompt = buildPublicSystemPrompt;
export const __test_buildOpenCodeMessages = buildOpenCodeMessages;
export const __test_normalizeAssistantReply = normalizeAssistantReply;
