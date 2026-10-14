/**
 * 「我们」私聊的客户端共享模块：会话类型、展示层常量、错误分类与暗号摘要工具。
 * 从 ChatPage 拆出以满足 500 行架构预算；人设提示词始终只留在服务端。
 */
export type PersonaId = "su-yiping" | "liao-wenjing";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  error?: boolean;
};

export type ChatSession = { persona: PersonaId; password: string };

/** 前端只放展示层信息 + 暗号摘要；人设提示词全部留在服务端。 */
export const PERSONAS = [
  { id: "su-yiping", avatar: "🐻", nameKey: "usChat.personas.su.name", tagKey: "usChat.personas.su.tag", lineKey: "usChat.personas.su.line" },
  { id: "liao-wenjing", avatar: "💕", nameKey: "usChat.personas.liao.name", tagKey: "usChat.personas.liao.tag", lineKey: "usChat.personas.liao.line" },
] as const;

export const PERSONA_SALTS: Record<PersonaId, string> = {
  "su-yiping": "salt-su-2025",
  "liao-wenjing": "salt-liao-2025",
};

/** SHA-256(盐 + 明文) 的十六进制摘要，服务端会按同一规则二次校验。 */
export const PERSONA_DIGESTS: Record<PersonaId, string> = {
  "su-yiping": "802b6255a20a557ebfa47d0b763f78ba64a9a04af395cc2a43b928b70e36d58b",
  "liao-wenjing": "6d29e02d873f17ae24a24281c3bc5c9ad21a6e475a424bad9b1787afe1fa2458",
};

export const SESSION_STORAGE_KEY = "us-chat-session";
export const HISTORY_LIMIT = 12;
export const MESSAGE_MAX_LENGTH = 500;
/** 与 us-chat.css 的 --us-composer-max 保持同一上限。 */
export const COMPOSER_MAX_HEIGHT = 132;

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** 服务端返回了非成功状态：message 为服务端 JSON 文案（可能为空串）。 */
export class ReplyServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplyServerError";
  }
}

/** 429 限流：retryAfterSeconds 为 Retry-After 秒数（0 表示响应未提供），serverText 为服务端文案。 */
export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;
  readonly serverText: string;

  constructor(retryAfterSeconds: number, serverText: string) {
    super("rate-limited");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
    this.serverText = serverText;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isPersonaId(value: unknown): value is PersonaId {
  return value === "su-yiping" || value === "liao-wenjing";
}

export function createMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadSession(): ChatSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ChatSession>;
    if (isPersonaId(parsed.persona) && typeof parsed.password === "string" && parsed.password.length > 0) {
      return { persona: parsed.persona, password: parsed.password };
    }
  } catch {
    /* 关掉标签页或解析失败都视为未登录 */
  }
  return null;
}

export async function sha256Hex(text: string): Promise<string | null> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return null;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

export async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data && typeof data.error === "string" && data.error.length > 0) return data.error;
  } catch {
    /* 非 JSON 响应按通用错误处理 */
  }
  return "";
}
