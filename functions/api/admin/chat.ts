import { isAdminRequest } from "../../_auth";
import { contentKeys, defaultSiteContent, mergeSiteContent } from "../../../src/data/content";
import type { PartialSiteContent, SiteContent } from "../../../src/types/content";

type D1DatabaseLike = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<{ results: T[] }>;
    };
  };
};

type PagesFunction<Env> = (context: {
  request: Request;
  env: Env;
}) => Response | Promise<Response>;

type Env = {
  ADMIN_PASSWORD?: string;
  OPENCODE_GO_API_KEY?: string;
  DB?: D1DatabaseLike;
};

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ContentRow = {
  key: string;
  value_json: string;
};

const openCodeEndpoint = "https://opencode.ai/zen/go/v1/chat/completions";
const model = "deepseek-v4-flash";
const maxMessages = 8;
const maxMessageLength = 800;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const authenticated = await isAdminRequest(context.request, context.env);
  if (!authenticated) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!context.env.OPENCODE_GO_API_KEY) {
    return json({ error: "OPENCODE_GO_API_KEY is not configured" }, 503);
  }

  const body = (await context.request.json().catch(() => ({}))) as {
    messages?: unknown;
  };
  const messages = normalizeMessages(body.messages);
  if (messages.length === 0) {
    return json({ error: "Message is required" }, 400);
  }

  const siteContent = await loadSiteContent(context.env);
  const response = await fetch(openCodeEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${context.env.OPENCODE_GO_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      stream: false,
      max_tokens: 500,
      temperature: 0.4,
      messages: [
        { role: "system", content: buildSystemPrompt(siteContent) },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    return json({ error: "AI assistant is temporarily unavailable" }, 502);
  }

  const data = (await response.json().catch(() => ({}))) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    return json({ error: "AI assistant returned an empty response" }, 502);
  }

  return json({ reply });
};

function normalizeMessages(value: unknown): ChatMessage[] {
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

async function loadSiteContent(env: Env): Promise<SiteContent> {
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

function buildSystemPrompt(content: SiteContent) {
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

  return `你是奶黄包摄影后台预约助手，只回答网站相关问题。
你可以帮助管理员整理和解释摄影服务、套餐、FAQ、预约流程、拍摄规则、隐私授权、风格、地点建议和后台内容。
如果用户询问无关内容，请礼貌拒答，并引导回摄影预约或网站内容。
不要编造不存在的档期、优惠、价格、交付承诺或联系方式。
以“重要拍摄边界”中的受众限制为最高优先级；如果边界写着只接受女生或情侣，男生单人咨询时必须说明目前不接男生单人，可引导了解情侣约拍，不要回答“不限性别”。

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

export const __test_buildSystemPrompt = buildSystemPrompt;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
