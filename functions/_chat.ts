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

const openCodeEndpoint = "https://opencode.ai/zen/go/v1/chat/completions";
const model = "deepseek-v4-flash";
const openCodeMaxAttempts = 2;
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
    .map((item) => `${item.name}: ${item.price}, ${item.duration}, ${item.summary}`)
    .join("\n");
  const policies = content.servicePolicies
    .map((item) => `${item.title}: ${item.detail}`)
    .join("\n");
  const faqs = content.faqs
    .map((item) => `${item.question}: ${item.answer}`)
    .join("\n");
  const whyCards = content.whyCards
    .map((item) => `${item.title}: ${item.detail}`)
    .join("\n");
  const process = content.processSteps
    .map((item, index) => `${index + 1}. ${item}`)
    .join("\n");
  const safety = [
    content.sectionCopy.safety.title,
    ...content.sectionCopy.safety.paragraphs,
  ].join("\n");

  return `你是奶黄包摄影官网的访客咨询助手，只回答官网相关问题。
你可以帮助访客了解摄影服务、套餐、FAQ、预约流程、拍摄边界、隐私授权、风格建议、地点建议和预约方式。
如果用户询问无关内容，请礼貌拒答，并引导回摄影预约或官网内容。
不要编造不存在的档期、优惠、价格、交付承诺或联系方式。
以“重要拍摄边界”中的受众限制为最高优先级；如果边界写着只接受女生或情侣约拍，男生单人咨询时必须说明男生单人目前不接，可引导了解情侣约拍，不要回答“不限性别”。
回答要简洁、温和、适合公开访客阅读；如果问题涉及最终预约确认，引导用户通过页面上的小红书入口联系。
单次回答控制在 120 到 220 个汉字，最多 4 句或 4 个要点；必须以完整句号、问号或感叹号收尾，不要留下“如果您”“建议您”这类未完成的半句。

站点信息：
品牌：${content.siteConfig.brandName}
城市：${content.siteConfig.city}
简介：${content.siteConfig.description}
联系提示：${content.siteConfig.contactHint}

关于：
${content.sectionCopy.about.body}

重要拍摄边界：
${safety}

为什么选择：
${whyCards}

套餐：
${packages}

服务规则：
${policies}

预约流程：
${process}

FAQ：
${faqs}`;
}

export function getPublicChatDirectReply(messages: ChatMessage[]) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const asksAboutMaleSolo = /(男生|男的|男性|男士|男孩子|我是男)/.test(latestUserMessage)
    && /(可以|能|接|拍|约|写真|单人)/.test(latestUserMessage)
    && !/(情侣|对象|女朋友|男朋友|一起|双人)/.test(latestUserMessage);

  if (!asksAboutMaleSolo) return null;

  return "目前只接受女生或情侣约拍，男生单人暂时不接。如果是情侣纪念或情侣约拍，可以继续了解套餐、风格和预约流程。";
}

export async function requestChatCompletion(env: ChatEnv, messages: ChatMessage[], siteContent: SiteContent) {
  if (!env.OPENCODE_GO_API_KEY) {
    throw new Error("missing-api-key");
  }

  let lastError = "upstream-unavailable";

  for (let attempt = 1; attempt <= openCodeMaxAttempts; attempt += 1) {
    try {
      const response = await fetch(openCodeEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${env.OPENCODE_GO_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          stream: false,
          max_tokens: 720,
          temperature: 0.4,
          messages: [
            { role: "system", content: buildPublicSystemPrompt(siteContent) },
            ...messages,
          ],
        }),
      });

      if (!response.ok) {
        lastError = `upstream-${response.status}`;
        if (!shouldRetryUpstream(response.status) || attempt === openCodeMaxAttempts) break;
        await waitBeforeRetry(attempt);
        continue;
      }

      const data = (await response.json().catch(() => ({}))) as {
        choices?: Array<{
          finish_reason?: string;
          message?: {
            content?: string;
          };
        }>;
      };
      const choice = data.choices?.[0];
      const reply = normalizeAssistantReply(choice?.message?.content ?? "", choice?.finish_reason);
      if (reply) return reply;

      lastError = "empty-reply";
    } catch {
      lastError = "upstream-network";
    }

    if (attempt < openCodeMaxAttempts) {
      await waitBeforeRetry(attempt);
    }
  }

  throw new Error(lastError);
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
    setTimeout(resolve, 280 * attempt);
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
export const __test_normalizeAssistantReply = normalizeAssistantReply;
